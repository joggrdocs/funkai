import { generateText, streamText, stepCountIs } from "ai";
import type { AsyncIterableStream, LanguageModel } from "ai";

import { resolveOutput } from "@/core/agents/base/output.js";
import type { OutputSpec } from "@/core/agents/base/output.js";
import type {
  Agent,
  AgentConfig,
  AgentOverrides,
  GenerateResult,
  Message,
  StreamPart,
  StreamResult,
  SubAgents,
} from "@/core/agents/base/types.js";
import {
  resolveModel,
  buildAITools,
  resolveSystem,
  buildPrompt,
  toTokenUsage,
} from "@/core/agents/base/utils.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { Logger } from "@/core/logger.js";
import type { Tool } from "@/core/tool.js";
import { fireHooks, wrapHook } from "@/lib/hooks.js";
import { withModelMiddleware } from "@/lib/middleware.js";
import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";
import { toError } from "@/utils/error.js";

/**
 * Safely read a property from `overrides`, which may be undefined.
 * Replaces `overrides?.prop` optional chaining.
 *
 * @private
 */
function readOverride<
  TTools extends Record<string, Tool>,
  TSubAgents extends SubAgents,
  K extends keyof AgentOverrides<TTools, TSubAgents>,
>(
  overrides: AgentOverrides<TTools, TSubAgents> | undefined,
  key: K,
): AgentOverrides<TTools, TSubAgents>[K] | undefined {
  if (overrides !== undefined) {
    // eslint-disable-next-line security/detect-object-injection -- Key is a controlled function parameter, not user input
    return overrides[key];
  }
  return undefined;
}

/**
 * Safely compute the JSON-serialized length of a value.
 * Returns 0 if serialization fails (e.g. circular refs, BigInt).
 *
 * @private
 */
function safeSerializedLength(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    return typeof json === "string" ? json.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Return the value if the predicate is true, otherwise undefined.
 * Replaces `predicate ? value : undefined` ternary.
 *
 * @private
 */
function valueOrUndefined<T>(predicate: boolean, value: T): T | undefined {
  if (predicate) {
    return value;
  }
  return undefined;
}

/**
 * Resolve an optional output param. Returns `resolveOutput(param)` if
 * param is defined, otherwise undefined.
 *
 * @private
 */
function resolveOptionalOutput(
  param: import("@/core/agents/base/output.js").OutputParam | undefined,
): import("@/core/agents/base/output.js").OutputSpec | undefined {
  if (param !== undefined) {
    return resolveOutput(param);
  }
  return undefined;
}

/**
 * Safely extract a property from an object, returning `{}` if the
 * property does not exist. Replaces `'key' in obj ? obj[key] : {}` ternary.
 *
 * @private
 */
function extractProperty(obj: Record<string, unknown>, key: string): unknown {
  if (key in obj) {
    // eslint-disable-next-line security/detect-object-injection -- Key is a controlled function parameter, not user input
    return obj[key];
  }
  return {};
}

/**
 * Extract token usage from a step's usage object, defaulting to 0
 * when usage is undefined. Replaces optional chaining on `step.usage`.
 *
 * @private
 */
function extractUsage(
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  if (usage !== undefined) {
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    return {
      inputTokens,
      outputTokens,
      totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
    };
  }
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

/**
 * Return `ifOutput` when `output` is defined, `ifText` otherwise.
 * Replaces `output ? aiResult.output : aiResult.text` ternary.
 *
 * @private
 */
function pickByOutput<T>(output: unknown, ifOutput: T, ifText: T): T {
  if (output !== undefined) {
    return ifOutput;
  }
  return ifText;
}

/**
 * Create an agent with typed input, tools, subagents, and hooks.
 *
 * Agents run a tool loop (via the AI SDK's `generateText`) until a
 * stop condition is met. They support:
 * - **Typed input** via Zod schema + prompt template.
 * - **Simple mode** — pass a string or messages directly.
 * - **Tools** for function calling.
 * - **Subagents** auto-wrapped as delegatable tools.
 * - **Inline overrides** per call.
 * - **Hooks** for observability.
 * - **Result return type** that never throws.
 *
 * @typeParam TInput - Agent input type (default: `string | Message[]`).
 * @typeParam TOutput - Agent output type (default: `string`).
 * @typeParam TTools - Record of tools.
 * @typeParam TSubAgents - Record of subagents.
 * @param config - Agent configuration including name, model, schemas,
 *   tools, subagents, hooks, and logger.
 * @returns An `Agent` instance with `.generate()`, `.stream()`, and `.fn()`.
 *
 * @example
 * ```typescript
 * // Simple mode — pass a string directly
 * const helper = agent({
 *   name: 'helper',
 *   model: 'openai/gpt-4.1',
 *   system: 'You are a helpful assistant.',
 * })
 * await helper.generate('What is TypeScript?')
 *
 * // Typed mode — input schema + prompt template
 * const summarizer = agent({
 *   name: 'summarizer',
 *   input: z.object({ text: z.string() }),
 *   model: 'openai/gpt-4.1',
 *   prompt: ({ input }) => `Summarize:\n\n${input.text}`,
 * })
 * await summarizer.generate({ text: '...' })
 *
 * // Export as a plain function
 * export const summarize = summarizer.fn()
 * ```
 */
export function agent<
  TInput = string | Message[],
  TOutput = string,
  TTools extends Record<string, Tool> = {},
  TSubAgents extends SubAgents = {},
>(
  config: AgentConfig<TInput, TOutput, TTools, TSubAgents>,
): Agent<TInput, TOutput, TTools, TSubAgents> {
  const baseLogger = config.logger ?? createDefaultLogger();

  /**
   * Validate raw input against the config schema, if present.
   *
   * Returns a discriminated union: `{ ok: true, input }` on success,
   * `{ ok: false, error }` when validation fails.
   *
   * @private
   */
  function validateInput(
    rawInput: TInput,
  ): { ok: true; input: TInput } | { ok: false; error: { code: string; message: string } } {
    if (!config.input) {
      return { ok: true, input: rawInput };
    }
    const parsed = config.input.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Input validation failed: ${parsed.error.message}`,
        },
      };
    }
    return { ok: true, input: parsed.data as TInput };
  }

  /**
   * Resolved values shared by both `generate()` and `stream()`.
   *
   * Returned by `prepareGeneration()` so each method only contains
   * the logic that differs (the AI SDK call and result handling).
   *
   * @private
   */
  interface PreparedGeneration {
    readonly input: TInput;
    readonly model: LanguageModel;
    readonly aiTools: ReturnType<typeof buildAITools>;
    readonly system: string | undefined;
    readonly promptParams: { prompt: string } | { messages: Message[] };
    readonly output: OutputSpec | undefined;
    readonly maxSteps: number;
    readonly signal: AbortSignal | undefined;
    readonly onStepFinish: (step: {
      toolCalls?: ReadonlyArray<{ toolName: string } & Record<string, unknown>>;
      toolResults?: ReadonlyArray<{ toolName: string } & Record<string, unknown>>;
      usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    }) => Promise<void>;
  }

  /**
   * Perform the shared setup for `generate()` and `stream()`.
   *
   * Resolves the model/tools/system/prompt/output, fires onStart hooks,
   * and builds the `onStepFinish` handler. Input validation and logger
   * resolution are handled by the caller so that validation errors
   * return early while model/tool errors propagate through the caller's
   * try/catch.
   *
   * @private
   */
  async function prepareGeneration(
    input: TInput,
    log: Logger,
    overrides: AgentOverrides<TTools, TSubAgents> | undefined,
  ): Promise<PreparedGeneration> {
    const overrideModel = readOverride(overrides, "model");
    const modelRef = overrideModel ?? config.model;
    const baseModel = resolveModel(modelRef, config.resolver);
    const model = await withModelMiddleware({ model: baseModel });

    const overrideTools = readOverride(overrides, "tools");
    const overrideAgents = readOverride(overrides, "agents");
    const mergedTools = { ...config.tools, ...overrideTools } as Record<string, Tool>;
    const mergedAgents = { ...config.agents, ...overrideAgents } as SubAgents;
    const hasTools = Object.keys(mergedTools).length > 0;
    const hasAgents = Object.keys(mergedAgents).length > 0;

    const aiTools = buildAITools(
      valueOrUndefined(hasTools, mergedTools),
      valueOrUndefined(hasAgents, mergedAgents),
    );

    const overrideSystem = readOverride(overrides, "system");
    const systemConfig = overrideSystem ?? config.system;
    const system = resolveSystem(systemConfig, input);

    const promptParams = buildPrompt(input, config);

    const overrideOutput = readOverride(overrides, "output");
    const outputParam = overrideOutput ?? config.output;
    const output = resolveOptionalOutput(outputParam);

    const overrideMaxSteps = readOverride(overrides, "maxSteps");
    const maxSteps = overrideMaxSteps ?? config.maxSteps ?? 20;
    const signal = readOverride(overrides, "signal");

    await fireHooks(
      log,
      wrapHook(config.onStart, { input }),
      wrapHook(readOverride(overrides, "onStart"), { input }),
    );

    const stepCounter = { value: 0 };
    const onStepFinish = async (step: {
      toolCalls?: ReadonlyArray<{ toolName: string } & Record<string, unknown>>;
      toolResults?: ReadonlyArray<{ toolName: string } & Record<string, unknown>>;
      usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    }) => {
      const stepId = `${config.name}:${stepCounter.value++}`;
      const toolCalls = (step.toolCalls ?? []).map((tc) => {
        const args = extractProperty(tc, "args");
        return { toolName: tc.toolName, argsTextLength: safeSerializedLength(args) };
      });
      const toolResults = (step.toolResults ?? []).map((tr) => {
        const result = extractProperty(tr, "result");
        return { toolName: tr.toolName, resultTextLength: safeSerializedLength(result) };
      });
      const usage = extractUsage(step.usage);
      const event = { stepId, toolCalls, toolResults, usage };
      await fireHooks(
        log,
        wrapHook(config.onStepFinish, event),
        wrapHook(readOverride(overrides, "onStepFinish"), event),
      );
    };

    return {
      input,
      model,
      aiTools,
      system,
      promptParams,
      output,
      maxSteps,
      signal,
      onStepFinish,
    };
  }

  async function generate(
    rawInput: TInput,
    overrides?: AgentOverrides<TTools, TSubAgents>,
  ): Promise<import("@/utils/result.js").Result<GenerateResult<TOutput>>> {
    const validated = validateInput(rawInput);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    const overrideLogger = readOverride(overrides, "logger");
    const log = (overrideLogger ?? baseLogger).child({ agentId: config.name });
    const startedAt = Date.now();

    try {
      const prepared = await prepareGeneration(validated.input, log, overrides);
      const {
        input,
        model,
        aiTools,
        system,
        promptParams,
        output,
        maxSteps,
        signal,
        onStepFinish,
      } = prepared;

      log.debug("agent.generate start", { name: config.name });

      const aiResult = await generateText({
        model,
        system,
        ...promptParams,
        tools: aiTools,
        output,
        stopWhen: stepCountIs(maxSteps),
        abortSignal: signal,
        onStepFinish,
      });

      const duration = Date.now() - startedAt;

      const generateResult: GenerateResult<TOutput> = {
        output: pickByOutput(output, aiResult.output, aiResult.text) as TOutput,
        messages: aiResult.response.messages as Message[],
        usage: toTokenUsage(aiResult.totalUsage),
        finishReason: aiResult.finishReason,
      };

      await fireHooks(
        log,
        wrapHook(config.onFinish, { input, result: generateResult, duration }),
        wrapHook(readOverride(overrides, "onFinish"), {
          input,
          result: generateResult as GenerateResult,
          duration,
        }),
      );

      log.debug("agent.generate finish", { name: config.name, duration });

      return { ok: true, ...generateResult };
    } catch (thrown) {
      const error = toError(thrown);
      const duration = Date.now() - startedAt;

      log.error("agent.generate error", { name: config.name, error: error.message, duration });

      await fireHooks(
        log,
        wrapHook(config.onError, { input: validated.input, error }),
        wrapHook(readOverride(overrides, "onError"), { input: validated.input, error }),
      );

      return {
        ok: false,
        error: {
          code: "AGENT_ERROR",
          message: error.message,
          cause: error,
        },
      };
    }
  }

  async function stream(
    rawInput: TInput,
    overrides?: AgentOverrides<TTools, TSubAgents>,
  ): Promise<import("@/utils/result.js").Result<StreamResult<TOutput>>> {
    const validated = validateInput(rawInput);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    const overrideLogger = readOverride(overrides, "logger");
    const log = (overrideLogger ?? baseLogger).child({ agentId: config.name });
    const startedAt = Date.now();

    try {
      const prepared = await prepareGeneration(validated.input, log, overrides);
      const {
        input,
        model,
        aiTools,
        system,
        promptParams,
        output,
        maxSteps,
        signal,
        onStepFinish,
      } = prepared;

      log.debug("agent.stream start", { name: config.name });

      const aiResult = streamText({
        model,
        system,
        ...promptParams,
        tools: aiTools,
        output,
        stopWhen: stepCountIs(maxSteps),
        abortSignal: signal,
        onStepFinish,
      });

      const { readable, writable } = new TransformStream<StreamPart, StreamPart>();

      const done = (async () => {
        const writer = writable.getWriter();
        try {
          for await (const part of aiResult.fullStream) {
            await writer.write(part as StreamPart);
          }
          await writer.close();
        } catch (error) {
          await writer.abort(error).catch(() => {});
          throw error;
        }

        const finalOutput = pickByOutput(
          output,
          await aiResult.output,
          await aiResult.text,
        ) as TOutput;
        const response = await aiResult.response;
        const finalMessages = response.messages as Message[];
        const finalUsage = toTokenUsage(await aiResult.totalUsage);
        const finalFinishReason = await aiResult.finishReason;

        const duration = Date.now() - startedAt;

        const generateResult: GenerateResult<TOutput> = {
          output: finalOutput,
          messages: finalMessages,
          usage: finalUsage,
          finishReason: finalFinishReason,
        };
        await fireHooks(
          log,
          wrapHook(config.onFinish, { input, result: generateResult, duration }),
          wrapHook(readOverride(overrides, "onFinish"), {
            input,
            result: generateResult as GenerateResult,
            duration,
          }),
        );

        log.debug("agent.stream finish", { name: config.name, duration });

        return {
          output: finalOutput,
          messages: finalMessages,
          usage: finalUsage,
          finishReason: finalFinishReason,
        };
      })();

      // Catch stream errors: fire onError hooks and prevent unhandled rejections
      done.catch(async (thrown) => {
        const error = toError(thrown);
        const duration = Date.now() - startedAt;

        log.error("agent.stream error", { name: config.name, error: error.message, duration });

        await fireHooks(
          log,
          wrapHook(config.onError, { input, error }),
          wrapHook(readOverride(overrides, "onError"), { input, error }),
        );
      });

      const streamResult: StreamResult<TOutput> = {
        output: done.then((r) => r.output),
        messages: done.then((r) => r.messages),
        usage: done.then((r) => r.usage),
        finishReason: done.then((r) => r.finishReason),
        fullStream: readable as AsyncIterableStream<StreamPart>,
      };

      // Prevent unhandled rejection warnings when consumers don't await all promises
      streamResult.output.catch(() => {});
      streamResult.messages.catch(() => {});
      streamResult.usage.catch(() => {});
      streamResult.finishReason.catch(() => {});

      return { ok: true, ...streamResult };
    } catch (thrown) {
      const error = toError(thrown);
      const duration = Date.now() - startedAt;

      log.error("agent.stream error", { name: config.name, error: error.message, duration });

      await fireHooks(
        log,
        wrapHook(config.onError, { input: validated.input, error }),
        wrapHook(readOverride(overrides, "onError"), { input: validated.input, error }),
      );

      return {
        ok: false,
        error: {
          code: "AGENT_ERROR",
          message: error.message,
          cause: error,
        },
      };
    }
  }

  // eslint-disable-next-line no-shadow -- Local variable is the return value constructed inside its own factory function
  const agent: Agent<TInput, TOutput, TTools, TSubAgents> = {
    generate,
    stream,
    fn: () => generate,
  };

  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
  (agent as unknown as Record<symbol, unknown>)[RUNNABLE_META] = {
    name: config.name,
    inputSchema: config.input,
  } satisfies RunnableMeta;

  return agent;
}
