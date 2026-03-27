import { generateText, streamText, stepCountIs } from "ai";
import type { AsyncIterableStream, GenerateTextResult, ModelMessage, ToolSet } from "ai";

// See types.ts for why `any` is needed here — AI SDK's `Output` is a merged namespace + interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AIOutput = any;
import { isNil, isNotNil, pickBy } from "es-toolkit";

import { resolveOutput } from "@/core/agents/base/output.js";
import type { OutputParam, OutputSpec } from "@/core/agents/base/output.js";
import {
  buildAITools,
  extractAgentChain,
  resolveValue,
  resolveOptionalValue,
  buildPrompt,
} from "@/core/agents/base/utils.js";
import type { ParentAgentContext } from "@/core/agents/base/utils.js";
import type {
  Agent,
  AgentConfig,
  GenerateParams,
  GenerateResult,
  Resolver,
  StreamResult,
  SubAgents,
} from "@/core/agents/types.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { Logger } from "@/core/logger.js";
import type { LanguageModel } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type {
  AIStepResult,
  AgentChainEntry,
  Model,
  StepStartEvent,
  StreamPart,
} from "@/core/types.js";
import { createAgentStepFinishEvent } from "@/core/types.js";
import { fireHooks, wrapHook } from "@/lib/hooks.js";
import { withModelMiddleware } from "@/lib/middleware.js";
import { AGENT_CONFIG, RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";
import { toError } from "@/utils/error.js";
import { gatePromise, suppressRejection } from "@/utils/promise.js";
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
 * @typeParam TInput - Agent input type (default: `string | ModelMessage[]`).
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
  TInput = string | ModelMessage[],
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
    readonly promptParams: { prompt: string } | { messages: ModelMessage[] };
    readonly output: OutputSpec | undefined;
    readonly maxSteps: number;
    readonly signal: AbortSignal | undefined;
    readonly onStepFinish: (step: AIStepResult) => Promise<void>;
    readonly onStepStart: ((event: unknown) => Promise<void>) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI SDK passthrough params
    readonly aiSdkParams: Record<string, any>;
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
    const model = await withModelMiddleware({
      model: resolvedModel,
      middleware: config.middleware,
      toolInputExamples: config.toolInputExamples,
    });

    const resolvedTools = (await resolveOptionalValue(config.tools, input)) ?? {};
    const mergedTools = { ...resolvedTools, ...params.tools };
    const resolvedAgents = (await resolveOptionalValue(config.agents, input)) ?? {};
    const mergedAgents = { ...resolvedAgents, ...params.agents };
    const hasTools = Object.keys(mergedTools).length > 0;
    const hasAgents = Object.keys(mergedAgents).length > 0;

    // Build agent chain: extend incoming chain with this agent's identity
    const incomingChain = extractAgentChain(params);
    const currentChain: readonly AgentChainEntry[] = [...incomingChain, { id: config.name }];

    // Only fixed-type hooks (onStepStart, onStepFinish) are forwarded to
    // Sub-agents. Generic hooks (onStart, onFinish, onError) are NOT
    // Forwarded because their event types are parameterized by TInput/TOutput
    // — a sub-agent has different generics, so the parent's typed hook
    // Would receive the wrong event shape at runtime. Sub-agent activity
    // Is still observable via onStepFinish at the parent's tool-loop level.
    // See packages/agents/docs/core/hooks.md for the full lifecycle.
    const parentCtx: ParentAgentContext = {
      log,
      onStepStart: buildMergedHook(log, config.onStepStart, params.onStepStart),
      onStepFinish: buildMergedHook(log, config.onStepFinish, params.onStepFinish),
      agentChain: currentChain,
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
    const onStepFinish = async (step: AIStepResult) => {
      const stepId = `${config.name}:${stepCounter.value++}`;
      const event = createAgentStepFinishEvent(step, {
        stepId,
        stepOperation: "agent",
        agentChain: currentChain,
      });
      await fireHooks(
        log,
        wrapHook(config.onStepFinish, event),
        wrapHook(params.onStepFinish, event),
      );
    };

    // Build onStepStart handler that fires config + per-call hooks
    const stepStartCounter = { value: 0 };
    const mergedOnStepStart = buildMergedHook(log, config.onStepStart, params.onStepStart);
    let onStepStart: ((event: unknown) => Promise<void>) | undefined;
    if (isNotNil(mergedOnStepStart)) {
      onStepStart = async (_aiEvent: unknown) => {
        const stepId = `${config.name}:${stepStartCounter.value++}`;
        const event: StepStartEvent = {
          stepId,
          stepOperation: "agent",
          agentChain: currentChain,
        };
        await mergedOnStepStart(event);
      };
    }

    // Collect AI SDK passthrough params (per-call overrides config)
    const aiSdkParams = pickBy(
      {
        toolChoice: params.toolChoice ?? config.toolChoice,
        providerOptions: params.providerOptions ?? config.providerOptions,
        activeTools: params.activeTools ?? config.activeTools,
        prepareStep: params.prepareStep ?? config.prepareStep,
        experimental_repairToolCall: params.repairToolCall ?? config.repairToolCall,
        headers: params.headers ?? config.headers,
        experimental_include: params.experimental_include ?? config.experimental_include,
        experimental_context: params.experimental_context ?? config.experimental_context,
        experimental_download: params.experimental_download ?? config.experimental_download,
        experimental_onToolCallStart: params.onToolCallStart ?? config.onToolCallStart,
        experimental_onToolCallFinish: params.onToolCallFinish ?? config.onToolCallFinish,
      },
      isNotNil,
    );

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
      onStepStart,
      aiSdkParams,
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
        onStepStart,
        aiSdkParams,
      } = prepared;

      log.debug("agent.generate start", { name: config.name });

      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- AI SDK requires any for exactOptionalPropertyTypes compatibility
      const generateParams: any = {
        model,
        ...promptParams,
        ...aiSdkParams,
        stopWhen: stepCountIs(maxSteps),
        onStepFinish,
      };
      if (system !== undefined) {
        generateParams.system = system;
      }
      if (aiTools !== undefined) {
        generateParams.tools = aiTools;
      }
      if (output !== undefined) {
        generateParams.output = output;
      }
      if (signal !== undefined) {
        generateParams.abortSignal = signal;
      }
      if (onStepStart !== undefined) {
        generateParams.experimental_onStepStart = onStepStart;
      }
      const aiResult = await generateText(generateParams);

      const duration = Date.now() - startedAt;

      const generateResult = formatGenerateResult<TOutput>(aiResult, output);

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
        onStepStart,
        aiSdkParams,
      } = prepared;

      log.debug("agent.stream start", { name: config.name });

      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- AI SDK requires any for exactOptionalPropertyTypes compatibility
      const streamParams: any = {
        model,
        ...promptParams,
        ...aiSdkParams,
        stopWhen: stepCountIs(maxSteps),
        onStepFinish,
      };
      if (system !== undefined) {
        streamParams.system = system;
      }
      if (aiTools !== undefined) {
        streamParams.tools = aiTools;
      }
      if (output !== undefined) {
        streamParams.output = output;
      }
      if (signal !== undefined) {
        streamParams.abortSignal = signal;
      }
      if (onStepStart !== undefined) {
        streamParams.experimental_onStepStart = onStepStart;
      }
      const aiResult = streamText(streamParams);

      const { readable, writable } = new TransformStream<StreamPart, StreamPart>();

      // Capture log for async closures — guaranteed set at this point
      // Log is guaranteed set — validated.input resolved above
      const streamLog = log as Logger;

      /**
       * @private
       */
      const processStream = async (): Promise<{
        output: TOutput;
        finishReason: string;
      }> => {
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
        const finalFinishReason = await aiResult.finishReason;

        const duration = Date.now() - startedAt;

        // Build a GenerateResult for the onFinish hook by awaiting remaining fields
        const steps = await aiResult.steps;
        const lastStep = steps.at(-1);
        if (!lastStep) {
          throw new Error("No steps returned from stream");
        }
        const generateResult = formatGenerateResult<TOutput>(
          {
            ...lastStep,
            totalUsage: await aiResult.totalUsage,
            steps,
            output: await aiResult.output,
            experimental_output: await aiResult.output,
          },
          output,
        );
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
          finishReason: finalFinishReason,
        };
      };

      const done = processStream();

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
        ...aiResult,
        // Rebind promise fields through the done gate to ensure they only
        // Resolve after processStream() has fully consumed the AI SDK stream.
        // Without this, consumers could race with stream consumption.
        text: gatePromise(done, aiResult.text),
        reasoning: gatePromise(done, aiResult.reasoning),
        sources: gatePromise(done, aiResult.sources),
        files: gatePromise(done, aiResult.files),
        toolCalls: gatePromise(done, aiResult.toolCalls),
        toolResults: gatePromise(done, aiResult.toolResults),
        finishReason: gatePromise(done, aiResult.finishReason),
        usage: gatePromise(done, aiResult.usage),
        totalUsage: gatePromise(done, aiResult.totalUsage),
        steps: gatePromise(done, aiResult.steps),
        response: gatePromise(done, aiResult.response),
        output: done.then((r) => r.output),
        fullStream: readable as AsyncIterableStream<StreamPart>,
        // NOTE: toTextStreamResponse and toUIMessageStreamResponse delegate directly to
        // The underlying AI SDK stream, NOT from the TransformStream above.
        // Do NOT consume fullStream concurrently with these methods —
        // They share the same underlying stream source.
        toTextStreamResponse: (init?: ResponseInit) => aiResult.toTextStreamResponse(init),
        toUIMessageStreamResponse: (options) => aiResult.toUIMessageStreamResponse(options),
      };

      // Prevent unhandled rejection warnings when consumers don't await all promises.
      // Each gated promise rejects when `done` rejects (stream error), so every
      // Promise field needs a no-op rejection handler attached.
      suppressRejection(streamResult.output);
      suppressRejection(streamResult.text);
      suppressRejection(streamResult.reasoning);
      suppressRejection(streamResult.sources);
      suppressRejection(streamResult.files);
      suppressRejection(streamResult.toolCalls);
      suppressRejection(streamResult.toolResults);
      suppressRejection(streamResult.finishReason);
      suppressRejection(streamResult.usage);
      suppressRejection(streamResult.totalUsage);
      suppressRejection(streamResult.steps);
      suppressRejection(streamResult.response);

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
 * Spread the AI SDK result and only override `output` via `pickByOutput`.
 *
 * @private
 */
function formatGenerateResult<TOutput>(
  aiResult: GenerateTextResult<ToolSet, AIOutput>,
  output: OutputSpec | undefined,
): GenerateResult<TOutput> {
  return {
    ...aiResult,
    output: pickByOutput(output, aiResult.output, aiResult.text) as TOutput,
  };
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
