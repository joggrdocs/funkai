import { generateText, streamText, stepCountIs } from "ai";
import type { AsyncIterableStream } from "ai";
import { isNil, isNotNil, isString } from "es-toolkit";

import { resolveOutput } from "@/core/agents/base/output.js";
import type { OutputParam, OutputSpec } from "@/core/agents/base/output.js";
import {
  buildAITools,
  resolveValue,
  resolveOptionalValue,
  buildPrompt,
  toTokenUsage,
} from "@/core/agents/base/utils.js";
import type { ParentAgentContext } from "@/core/agents/base/utils.js";
import type {
  Agent,
  AgentConfig,
  GenerateParams,
  GenerateResult,
  Message,
  Resolver,
  StreamResult,
  SubAgents,
} from "@/core/agents/types.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { Logger } from "@/core/logger.js";
import type { LanguageModel } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type { Model, StepFinishEvent, StreamPart } from "@/core/types.js";
import { fireHooks, wrapHook } from "@/lib/hooks.js";
import { withModelMiddleware } from "@/lib/middleware.js";
import { AGENT_CONFIG, RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";
import { toError } from "@/utils/error.js";
import type { Result } from "@/utils/result.js";

/**
 * Create an agent with typed input, tools, subagents, and hooks.
 *
 * Agents run a tool loop (via the AI SDK's `generateText`) until a
 * stop condition is met. They support:
 * - **Typed input** via Zod schema + prompt template.
 * - **Simple mode** — pass a string prompt or messages directly.
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
 * import { openai } from '@ai-sdk/openai'
 *
 * // Simple mode — pass a prompt directly
 * const helper = agent({
 *   name: 'helper',
 *   model: openai('gpt-4.1'),
 *   system: 'You are a helpful assistant.',
 * })
 * await helper.generate({ prompt: 'What is TypeScript?' })
 *
 * // Typed mode — input schema + prompt template
 * const summarizer = agent({
 *   name: 'summarizer',
 *   input: z.object({ text: z.string() }),
 *   model: openai('gpt-4.1'),
 *   prompt: ({ input }) => `Summarize:\n\n${input.text}`,
 * })
 * await summarizer.generate({ input: { text: '...' } })
 *
 * // Export as a plain function
 * export const summarize = summarizer.fn()
 * ```
 */
export function agent<
  TInput = string | Message[],
  TOutput = string,
  // oxlint-disable-next-line typescript-eslint/ban-types -- {} is intentional: allows unconstrained tool/subagent defaults
  TTools extends Record<string, Tool> = {},
  // oxlint-disable-next-line typescript-eslint/ban-types
  TSubAgents extends SubAgents = {},
  TModel extends Resolver<TInput, Model> = Resolver<TInput, Model>,
>(
  config: AgentConfig<TInput, TOutput, TTools, TSubAgents, TModel>,
): Agent<TInput, TOutput, TTools, TSubAgents, TModel> {
  /**
   * Extract the raw input from unified params.
   *
   * Reads from `params.input` (typed mode), `params.prompt` (simple
   * string), or `params.messages` (message array). At least one must
   * be present.
   *
   * @private
   */
  function extractInput(params: GenerateParams<TInput, TTools, TSubAgents, TOutput>): TInput {
    if (Object.hasOwn(params, "prompt") && !isNil(params.prompt)) {
      return params.prompt as unknown as TInput;
    }
    if (Object.hasOwn(params, "messages") && !isNil(params.messages)) {
      return params.messages as unknown as TInput;
    }
    if (Object.hasOwn(params, "input") && !isNil(params.input)) {
      return params.input as TInput;
    }
    throw new Error(
      "Missing input: provide `prompt`, `messages`, or `input` in the params object.",
    );
  }

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
      toolCalls?: readonly ({ toolName: string } & Record<string, unknown>)[];
      toolResults?: readonly ({ toolName: string } & Record<string, unknown>)[];
      usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    }) => Promise<void>;
  }

  /**
   * Resolve the abort signal from params, combining `signal` and `timeout`.
   *
   * @private
   */
  function resolveSignal(
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): AbortSignal | undefined {
    const { timeout, signal } = params;
    if (signal && isNotNil(timeout)) {
      return AbortSignal.any([signal, AbortSignal.timeout(timeout)]);
    }
    if (isNotNil(timeout)) {
      return AbortSignal.timeout(timeout);
    }
    return signal;
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
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): Promise<PreparedGeneration> {
    const resolvedModel = params.model ?? (await resolveValue(config.model, input));
    const model = await withModelMiddleware({ model: resolvedModel });

    const resolvedTools =
      (await resolveOptionalValue(config.tools, input)) ?? ({} as Record<string, Tool>);
    const mergedTools = { ...resolvedTools, ...params.tools } as Record<string, Tool>;
    const resolvedAgents = (await resolveOptionalValue(config.agents, input)) ?? ({} as SubAgents);
    const mergedAgents = { ...resolvedAgents, ...params.agents } as SubAgents;
    const hasTools = Object.keys(mergedTools).length > 0;
    const hasAgents = Object.keys(mergedAgents).length > 0;

    // Only fixed-type hooks (onStepStart, onStepFinish) are forwarded to
    // sub-agents. Generic hooks (onStart, onFinish, onError) are NOT
    // forwarded because their event types are parameterized by TInput/TOutput
    // — a sub-agent has different generics, so the parent's typed hook
    // would receive the wrong event shape at runtime. Sub-agent activity
    // is still observable via onStepFinish at the parent's tool-loop level.
    // See packages/agents/docs/core/hooks.md for the full lifecycle.
    const parentCtx: ParentAgentContext = {
      log,
      onStepStart: params.onStepStart,
      onStepFinish: buildMergedHook(log, config.onStepFinish, params.onStepFinish),
    };

    const aiTools = buildAITools(
      valueOrUndefined(hasTools, mergedTools),
      valueOrUndefined(hasAgents, mergedAgents),
      parentCtx,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- params.system is Resolver-shaped; safe to resolve
    const system =
      (await resolveOptionalValue(params.system as Resolver<TInput, string> | undefined, input)) ??
      (await resolveOptionalValue(config.system, input));

    const promptParams = await buildPrompt(input, config);

    const outputParam = params.output ?? config.output;
    const output = resolveOptionalOutput(outputParam);

    const resolvedMaxSteps = await resolveOptionalValue(config.maxSteps, input);
    const maxSteps = params.maxSteps ?? resolvedMaxSteps ?? 20;
    const signal = resolveSignal(params);

    await fireHooks(log, wrapHook(config.onStart, { input }), wrapHook(params.onStart, { input }));

    const stepCounter = { value: 0 };
    const onStepFinish = async (step: {
      toolCalls?: readonly ({ toolName: string } & Record<string, unknown>)[];
      toolResults?: readonly ({ toolName: string } & Record<string, unknown>)[];
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
      const event: StepFinishEvent = { stepId, toolCalls, toolResults, usage };
      await fireHooks(
        log,
        wrapHook(config.onStepFinish, event),
        wrapHook(params.onStepFinish, event),
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
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): Promise<Result<GenerateResult<TOutput>>> {
    const startedAt = Date.now();
    let resolvedInput: TInput | undefined;
    let log: Logger | undefined;

    try {
      const rawInput = extractInput(params);
      const validated = validateInput(rawInput);
      if (!validated.ok) {
        return { ok: false, error: validated.error };
      }

      resolvedInput = validated.input;

      const resolvedLogger =
        params.logger ??
        (await resolveOptionalValue(config.logger, validated.input)) ??
        createDefaultLogger();
      log = resolvedLogger.child({ agentId: config.name });
      const prepared = await prepareGeneration(validated.input, log, params);
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
        wrapHook(params.onFinish, {
          input,
          result: generateResult,
          duration,
        }),
      );

      log.debug("agent.generate finish", { name: config.name, duration });

      return { ok: true, ...generateResult };
    } catch (caughtError) {
      const error = toError(caughtError);
      const duration = Date.now() - startedAt;
      const errorLog = log ?? createDefaultLogger().child({ agentId: config.name });

      errorLog.error("agent.generate error", {
        name: config.name,
        error: error.message,
        duration,
      });

      if (isNotNil(resolvedInput)) {
        await fireHooks(
          errorLog,
          wrapHook(config.onError, { input: resolvedInput as TInput, error }),
          wrapHook(params.onError, { input: resolvedInput as TInput, error }),
        );
      }

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
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): Promise<Result<StreamResult<TOutput>>> {
    const startedAt = Date.now();
    let resolvedInput: TInput | undefined;
    let log: Logger | undefined;

    try {
      const rawInput = extractInput(params);
      const validated = validateInput(rawInput);
      if (!validated.ok) {
        return { ok: false, error: validated.error };
      }

      resolvedInput = validated.input;

      const resolvedLogger =
        params.logger ??
        (await resolveOptionalValue(config.logger, validated.input)) ??
        createDefaultLogger();
      log = resolvedLogger.child({ agentId: config.name });
      const prepared = await prepareGeneration(validated.input, log, params);
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

      // Capture log for async closures — guaranteed set at this point
      const streamLog = log as Logger;

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
          streamLog,
          wrapHook(config.onFinish, { input, result: generateResult, duration }),
          wrapHook(params.onFinish, {
            input,
            result: generateResult,
            duration,
          }),
        );

        streamLog.debug("agent.stream finish", { name: config.name, duration });

        return {
          output: finalOutput,
          messages: finalMessages,
          usage: finalUsage,
          finishReason: finalFinishReason,
        };
      })();

      // Catch stream errors: fire onError hooks and prevent unhandled rejections
      done.catch(async (caughtError) => {
        const error = toError(caughtError);
        const duration = Date.now() - startedAt;

        streamLog.error("agent.stream error", {
          name: config.name,
          error: error.message,
          duration,
        });

        await fireHooks(
          streamLog,
          wrapHook(config.onError, { input, error }),
          wrapHook(params.onError, { input, error }),
        );
      });

      const streamResult: StreamResult<TOutput> = {
        output: done.then((r) => r.output),
        messages: done.then((r) => r.messages),
        usage: done.then((r) => r.usage),
        finishReason: done.then((r) => r.finishReason),
        fullStream: readable as AsyncIterableStream<StreamPart>,
        // NOTE: toTextStreamResponse and toUIMessageStreamResponse delegate directly to
        // The underlying AI SDK stream, NOT from the TransformStream above.
        // Do NOT consume fullStream concurrently with these methods —
        // They share the same underlying stream source.
        toTextStreamResponse: (init) => aiResult.toTextStreamResponse(init),
        toUIMessageStreamResponse: (options) => aiResult.toUIMessageStreamResponse(options),
      };

      // Prevent unhandled rejection warnings when consumers don't await all promises
      streamResult.output.catch(() => {});
      streamResult.messages.catch(() => {});
      streamResult.usage.catch(() => {});
      streamResult.finishReason.catch(() => {});

      return { ok: true, ...streamResult };
    } catch (caughtError) {
      const error = toError(caughtError);
      const duration = Date.now() - startedAt;
      const errorLog = log ?? createDefaultLogger().child({ agentId: config.name });

      errorLog.error("agent.stream error", {
        name: config.name,
        error: error.message,
        duration,
      });

      if (isNotNil(resolvedInput)) {
        await fireHooks(
          errorLog,
          wrapHook(config.onError, { input: resolvedInput as TInput, error }),
          wrapHook(params.onError, { input: resolvedInput as TInput, error }),
        );
      }

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
  const agent: Agent<TInput, TOutput, TTools, TSubAgents, TModel> = {
    model: config.model,
    generate,
    stream,
    fn: () => generate,
  };

  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
  // oxlint-disable-next-line unicorn/no-immediate-mutation -- Symbol-keyed property must be assigned after object creation
  (agent as unknown as Record<symbol, unknown>)[RUNNABLE_META] = {
    name: config.name,
    inputSchema: config.input,
  } satisfies RunnableMeta;

  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
  (agent as unknown as Record<symbol, unknown>)[AGENT_CONFIG] = config;

  return agent;
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Safely compute the JSON-serialized length of a value.
 * Returns 0 if serialization fails (e.g. circular refs, BigInt).
 *
 * @private
 */
function safeSerializedLength(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    if (isString(json)) {
      return json.length;
    }
    return 0;
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
function resolveOptionalOutput(param: OutputParam | undefined): OutputSpec | undefined {
  if (isNotNil(param)) {
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
  if (Object.hasOwn(obj, key)) {
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
  if (isNotNil(usage)) {
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
  if (isNotNil(output)) {
    return ifOutput;
  }
  return ifText;
}

/**
 * Build a merged hook that fires config-level and per-call hooks sequentially.
 *
 * Returns `undefined` when both are absent so `buildParentParams` skips
 * the field entirely and sub-agent defaults are preserved.
 *
 * @private
 */
function buildMergedHook<E>(
  log: Logger,
  configHook: ((event: E) => void | Promise<void>) | undefined,
  callHook: ((event: E) => void | Promise<void>) | undefined,
): ((event: E) => void | Promise<void>) | undefined {
  if (isNil(configHook) && isNil(callHook)) {
    return undefined;
  }
  return async (event: E) => {
    await fireHooks(log, wrapHook(configHook, event), wrapHook(callHook, event));
  };
}

