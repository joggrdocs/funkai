import type { AsyncIterableStream, LanguageModelUsage, ModelMessage } from "ai";
import { isNil, isNotNil } from "es-toolkit";

import { extractAgentChain, resolveOptionalValue } from "@/core/agents/base/utils.js";
import {
  collectTextFromMessages,
  createAssistantMessage,
  createUserMessage,
} from "@/core/agents/flow/messages.js";
import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import { createStepBuilder } from "@/core/agents/flow/steps/factory.js";

import type {
  FlowAgent,
  FlowAgentConfig,
  FlowAgentConfigWithOutput,
  FlowAgentConfigWithoutOutput,
  FlowAgentGenerateResult,
  FlowAgentHandler,
  FlowSubAgents,
  InternalFlowAgentOptions,
} from "@/core/agents/flow/types.js";
import type { BaseStreamResult, GenerateParams } from "@/core/agents/types.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { Logger } from "@/core/logger.js";
import type { AgentChainEntry, StepFinishEvent, StepStartEvent, StreamPart } from "@/core/types.js";
import type { Context } from "@/lib/context.js";
import { fireHooks, wrapHook } from "@/lib/hooks.js";
import { FLOW_AGENT_CONFIG, RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";
import type { TraceEntry } from "@/lib/trace.js";
import { collectUsages, snapshotTrace } from "@/lib/trace.js";
import { toError } from "@/utils/error.js";
import type { Result } from "@/utils/result.js";

/**
 * Hook signature for step-finish events.
 *
 * @private
 */
type StepStartHook = (event: StepStartEvent) => void | Promise<void>;
type StepFinishHook = (event: StepFinishEvent) => void | Promise<void>;

/**
 * Build a merged `onStepFinish` parent hook that fires both the config-level
 * and per-call override hooks sequentially (config first, then override).
 *
 * Returns `undefined` when neither hook is provided, so `createStepBuilder`
 * skips the callback entirely.
 *
 * @param log - Logger for `fireHooks` error reporting.
 * @param configHook - The hook from `FlowAgentConfig`.
 * @param overrideHook - The hook from `GenerateParams`.
 * @returns A merged hook callback, or `undefined`.
 *
 * @private
 */
function buildMergedStepFinishHook(
  log: Logger,
  configHook: StepFinishHook | undefined,
  overrideHook: StepFinishHook | undefined,
): StepFinishHook | undefined {
  if (isNil(configHook) && isNil(overrideHook)) {
    return undefined;
  }
  return async (event) => {
    await fireHooks(log, wrapHook(configHook, event), wrapHook(overrideHook, event));
  };
}

/**
 * Build a merged `onStepStart` parent hook that fires both the config-level
 * and per-call override hooks sequentially (config first, then override).
 *
 * @private
 */
function buildMergedStepStartHook(
  log: Logger,
  configHook: StepStartHook | undefined,
  overrideHook: StepStartHook | undefined,
): StepStartHook | undefined {
  if (isNil(configHook) && isNil(overrideHook)) {
    return undefined;
  }
  return async (event) => {
    await fireHooks(log, wrapHook(configHook, event), wrapHook(overrideHook, event));
  };
}

/**
 * Augment the step builder with custom steps from the engine.
 *
 * @private
 */
function augmentStepBuilder(
  base: StepBuilder,
  ctx: Context,
  internal: InternalFlowAgentOptions | undefined,
): StepBuilder {
  if (internal && internal.augment$) {
    return internal.augment$(base, ctx);
  }
  return base;
}

/**
 * Create a flow agent with typed input/output, tracked steps, and hooks.
 *
 * A flow agent is an agent whose behavior is defined by code, not by an LLM.
 * You write the orchestration logic — calling sub-agents, running steps,
 * using concurrency primitives — and the framework wraps it in the same
 * API surface as a regular `agent`.
 *
 * To consumers, a `FlowAgent` IS an `Agent`. Same `.generate()`, same
 * `.stream()`, same `.fn()`. Same `BaseGenerateResult` contract. The
 * only difference is internal: an `agent` runs an LLM tool loop, a
 * `flowAgent` runs your handler function.
 *
 * Each `$` step is modeled as a synthetic tool call in the message history.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 * @param config - Flow agent configuration including name, schemas,
 *   hooks, and logger.
 * @param handler - The flow agent handler function that receives
 *   validated input and the `$` step builder.
 * @param _internal - Internal options used by the engine. Not public API.
 * @returns A `FlowAgent` instance with `.generate()`, `.stream()`,
 *   and `.fn()`.
 *
 * @example
 * ```typescript
 * const pipeline = flowAgent({
 *   name: 'doc-pipeline',
 *   input: z.object({ repo: z.string() }),
 *   output: z.object({ docs: z.array(z.string()) }),
 * }, async ({ input, $ }) => {
 *   const files = await $.step({
 *     id: 'scan-repo',
 *     execute: () => scanRepo(input.repo),
 *   })
 *
 *   if (!files.ok) throw files.error
 *
 *   const docs = await $.map({
 *     id: 'generate-docs',
 *     input: files.value,
 *     execute: async ({ item, $ }) => {
 *       const result = await $.agent({
 *         id: 'write-doc',
 *         agent: writerAgent,
 *         input: item,
 *       })
 *       return result.ok ? result.value.output : ''
 *     },
 *     concurrency: 3,
 *   })
 *
 *   return { docs: docs.ok ? docs.value : [] }
 * })
 * ```
 */
/**
 * Create a flow agent with structured output.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 */
export function flowAgent<TInput, TOutput>(
  config: FlowAgentConfigWithOutput<TInput, TOutput>,
  handler: FlowAgentHandler<TInput, TOutput>,
  _internal?: InternalFlowAgentOptions,
): FlowAgent<TInput, TOutput>;

/**
 * Create a flow agent without structured output.
 *
 * The handler returns `void` — sub-agent text is collected as the
 * `string` output. Ideal for orchestration-only flows where the
 * sub-agents produce the final text.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 */
export function flowAgent<TInput>(
  config: FlowAgentConfigWithoutOutput<TInput>,
  handler: FlowAgentHandler<TInput, void>,
  _internal?: InternalFlowAgentOptions,
): FlowAgent<TInput, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- implementation signature must accept both overloads
export function flowAgent<TInput, TOutput = any>(
  config: FlowAgentConfig<TInput, TOutput>,
  handler: FlowAgentHandler<TInput, TOutput> | FlowAgentHandler<TInput, void>,
  _internal?: InternalFlowAgentOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened return to satisfy both overloads
): FlowAgent<TInput, any> {
  /**
   * Resolve the handler output into a final value, validating against
   * the output schema when present. Also pushes the assistant message.
   *
   * Returns `{ ok: true, value }` on success, or `{ ok: false, message }`
   * when output validation fails.
   *
   * @private
   */
  function resolveFlowOutput(
    output: unknown,
    messages: readonly ModelMessage[],
  ): { ok: true; value: unknown; message: ModelMessage } | { ok: false; message: string } {
    if (isNotNil(config.output)) {
      const outputParsed = config.output.safeParse(output);
      if (!outputParsed.success) {
        return { ok: false, message: `Output validation failed: ${outputParsed.error.message}` };
      }
      return {
        ok: true,
        value: outputParsed.data,
        message: createAssistantMessage(outputParsed.data),
      };
    }
    const text = collectTextFromMessages(messages);
    return { ok: true, value: text, message: createAssistantMessage(text) };
  }

  /**
   * Resolved values shared by both `generate()` and `stream()`.
   *
   * Returned by `prepareFlowAgent()` so each method only contains
   * the logic that differs (sync vs async result handling, stream piping).
   *
   * @private
   */
  interface PreparedFlowAgent {
    readonly parsedInput: TInput;
    readonly startedAt: number;
    readonly log: Logger;
    readonly $: StepBuilder;
    readonly trace: TraceEntry[];
    readonly messages: ModelMessage[];
    readonly agents: Readonly<FlowSubAgents>;
  }

  /**
   * Perform the shared setup for `generate()` and `stream()`.
   *
   * Validates input, resolves the logger, creates the execution context
   * (signal, trace, messages), builds the step builder, pushes the user
   * message, and fires onStart hooks.
   *
   * Returns `{ ok: false, error }` when input validation fails, or
   * `{ ok: true, ...prepared }` with all resolved values.
   *
   * The optional `writer` param is forwarded to `createStepBuilder`
   * for the streaming path.
   *
   * @private
   */
  /**
   * Extract the raw input from the params union.
   *
   * @private
   */
  function extractInput(params: GenerateParams<TInput>): unknown {
    if (Object.hasOwn(params, "prompt") && !isNil(params.prompt)) {
      return params.prompt;
    }
    if (Object.hasOwn(params, "messages") && !isNil(params.messages)) {
      return params.messages;
    }
    if (Object.hasOwn(params, "input") && !isNil(params.input)) {
      return params.input;
    }
    throw new Error(
      "Missing input: provide `prompt`, `messages`, or `input` in the params object.",
    );
  }

  /**
   * Resolve the abort signal from params, combining `signal` and `timeout`.
   *
   * @private
   */
  function resolveSignal(params: GenerateParams<TInput>): AbortSignal {
    const { timeout, signal } = params;
    if (signal && isNotNil(timeout)) {
      return AbortSignal.any([signal, AbortSignal.timeout(timeout)]);
    }
    if (isNotNil(timeout)) {
      return AbortSignal.timeout(timeout);
    }
    if (signal) {
      return signal;
    }
    return new AbortController().signal;
  }

  async function prepareFlowAgent(
    params: GenerateParams<TInput>,
    writer?: WritableStreamDefaultWriter<StreamPart>,
  ): Promise<
    { ok: false; error: { code: string; message: string } } | ({ ok: true } & PreparedFlowAgent)
  > {
    const rawInput = extractInput(params);
    const inputParsed = config.input.safeParse(rawInput);
    if (!inputParsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Input validation failed: ${inputParsed.error.message}`,
        },
      };
    }
    const parsedInput = inputParsed.data as TInput;

    const startedAt = Date.now();
    const resolvedLogger =
      params.logger ??
      (await resolveOptionalValue(config.logger, parsedInput)) ??
      createDefaultLogger();
    const log = resolvedLogger.child({ flowAgentId: config.name });

    const signal = resolveSignal(params);
    const trace: TraceEntry[] = [];
    const messages: ModelMessage[] = [];
    const ctx: Context = { signal, log, trace, messages };

    // Build agent chain: extend incoming chain with this flow agent's identity
    const incomingChain = extractAgentChain(params);
    const currentChain: readonly AgentChainEntry[] = [...incomingChain, { id: config.name }];

    const mergedOnStepStart = buildMergedStepStartHook(log, config.onStepStart, params.onStepStart);
    const mergedOnStepFinish = buildMergedStepFinishHook(
      log,
      config.onStepFinish,
      params.onStepFinish,
    );

    const base$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: mergedOnStepStart,
        onStepFinish: mergedOnStepFinish,
      },
      writer,
      agentChain: currentChain,
    });

    const $ = augmentStepBuilder(base$, ctx, _internal);

    // Push user message
    messages.push(createUserMessage(parsedInput));

    await fireHooks(
      log,
      wrapHook(config.onStart, { input: parsedInput }),
      wrapHook(params.onStart, { input: parsedInput }),
    );

    const agents = Object.freeze({ ...config.agents });

    return {
      ok: true,
      parsedInput,
      startedAt,
      log,
      $,
      trace,
      messages,
      agents,
    };
  }

  async function generate(
    params: GenerateParams<TInput>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  ): Promise<Result<FlowAgentGenerateResult<any>>> {
    const prepared = await prepareFlowAgent(params);
    if (!prepared.ok) {
      return { ok: false, error: prepared.error };
    }
    const { parsedInput, startedAt, log, $, trace, messages, agents } = prepared;

    log.debug("flowAgent.generate start", { name: config.name });

    try {
      const output = await (handler as FlowAgentHandler<TInput, TOutput>)({
        input: parsedInput,
        $,
        log,
        agents,
      });

      const outputResult = resolveFlowOutput(output, messages);
      if (!outputResult.ok) {
        return {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: outputResult.message,
          },
        };
      }
      const resolvedOutput = outputResult.value;

      const duration = Date.now() - startedAt;

      const usage = sumTokenUsages(collectUsages(trace));
      const frozenTrace = snapshotTrace(trace);

      const result: FlowAgentGenerateResult<unknown> = {
        output: resolvedOutput,
        usage,
        finishReason: "stop",
        trace: frozenTrace,
        duration,
      };

      await fireHooks(
        log,
        wrapHook(
          config.onFinish as
            | ((event: {
                input: TInput;
                result: FlowAgentGenerateResult<unknown>;
                duration: number;
              }) => void | Promise<void>)
            | undefined,
          { input: parsedInput, result, duration },
        ),
        // oxlint-disable-next-line -- FlowAgentGenerateResult satisfies BaseGenerateResult but not full GenerateResult; cast required for shared hook type
        wrapHook(params.onFinish, {
          input: parsedInput,
          result: result as unknown as Parameters<NonNullable<typeof params.onFinish>>[0]["result"],
          duration,
        }),
      );

      log.debug("flowAgent.generate finish", { name: config.name, duration });

      return { ok: true, ...result };
    } catch (caughtError) {
      const error = toError(caughtError);
      const duration = Date.now() - startedAt;

      log.error("flowAgent.generate error", { name: config.name, error: error.message, duration });

      await fireHooks(
        log,
        wrapHook(config.onError, { input: parsedInput, error }),
        wrapHook(params.onError, { input: parsedInput, error }),
      );

      return {
        ok: false,
        error: {
          code: "FLOW_AGENT_ERROR",
          message: error.message,
          cause: error,
        },
      };
    }
  }

  async function stream(
    params: GenerateParams<TInput>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  ): Promise<Result<BaseStreamResult<any>>> {
    const { readable, writable } = new TransformStream<StreamPart, StreamPart>();
    const writer = writable.getWriter();

    const prepared = await prepareFlowAgent(params, writer);
    if (!prepared.ok) {
      return { ok: false, error: prepared.error };
    }
    const { parsedInput, startedAt, log, $, trace, messages, agents } = prepared;

    log.debug("flowAgent.stream start", { name: config.name });

    /**
     * Run the handler, pipe results through the stream, and fire lifecycle hooks.
     *
     * @private
     */
    async function processStream(): Promise<FlowAgentGenerateResult<unknown>> {
      try {
        const output = await (handler as FlowAgentHandler<TInput, TOutput>)({
          input: parsedInput,
          $,
          log,
          agents,
        });

        const outputResult = resolveFlowOutput(output, messages);
        if (!outputResult.ok) {
          throw new Error(outputResult.message);
        }
        const resolvedOutput = outputResult.value;

        const duration = Date.now() - startedAt;

        const usage = sumTokenUsages(collectUsages(trace));

        const result: FlowAgentGenerateResult<unknown> = {
          output: resolvedOutput,
          usage,
          finishReason: "stop",
          trace: snapshotTrace(trace),
          duration,
        };

        await fireHooks(
          log,
          wrapHook(
            config.onFinish as
              | ((event: {
                  input: TInput;
                  result: FlowAgentGenerateResult<unknown>;
                  duration: number;
                }) => void | Promise<void>)
              | undefined,
            { input: parsedInput, result, duration },
          ),
          // oxlint-disable-next-line -- FlowAgentGenerateResult satisfies BaseGenerateResult but not full GenerateResult; cast required for shared hook type
          wrapHook(params.onFinish, {
            input: parsedInput,
            result: result as unknown as Parameters<NonNullable<typeof params.onFinish>>[0]["result"],
            duration,
          }),
        );

        log.debug("flowAgent.stream finish", { name: config.name, duration });

        // Emit finish event and close the stream
        await writer.write({
          type: "finish",
          finishReason: "stop",
          rawFinishReason: undefined,
          totalUsage: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
          },
        } as StreamPart);
        await writer.close();

        return result;
      } catch (caughtError) {
        const error = toError(caughtError);
        const duration = Date.now() - startedAt;

        log.error("flowAgent.stream error", { name: config.name, error: error.message, duration });

        // Emit error event and close the stream
        /* V8 ignore start -- defensive; writer rarely rejects in practice */
        await writer.write({ type: "error", error } as StreamPart).catch((writeError) => {
          log.debug("failed to write error event to stream", { error: writeError });
        });
        await writer.close().catch((closeError) => {
          log.debug("failed to close stream writer", { error: closeError });
        });
        /* V8 ignore stop */

        await fireHooks(
          log,
          wrapHook(config.onError, { input: parsedInput, error }),
          wrapHook(params.onError, { input: parsedInput, error }),
        );

        throw error;
      }
    }

    // Run handler in background, piping results through stream
    const done = processStream();

    // Catch stream errors to prevent unhandled rejections
    done.catch(() => {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
    const streamResult: BaseStreamResult<any> = {
      output: done.then((r) => r.output),
      usage: done.then((r) => r.usage),
      finishReason: done.then((r) => r.finishReason),
      fullStream: readable as AsyncIterableStream<StreamPart>,
    };

    // Prevent unhandled rejection warnings when consumers don't await all promises
    // PromiseLike doesn't have .catch(), so use .then(undefined, noop)
    const noop = () => {};
    streamResult.output.then(undefined, noop);
    streamResult.usage.then(undefined, noop);
    streamResult.finishReason.then(undefined, noop);

    return { ok: true, ...streamResult };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  const agent: FlowAgent<TInput, any> = {
    generate,
    stream,
    fn: () => generate,
    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property; symbols cannot be user-controlled
    [RUNNABLE_META]: {
      name: config.name,
      inputSchema: config.input,
    } satisfies RunnableMeta,
    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property; symbols cannot be user-controlled
    [FLOW_AGENT_CONFIG]: { config, handler },
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  } as FlowAgent<TInput, any>; // oxlint-disable-line @typescript-eslint/no-explicit-any

  return agent;
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Sum multiple {@link LanguageModelUsage} objects field-by-field.
 *
 * @private
 */
function sumTokenUsages(usages: LanguageModelUsage[]): LanguageModelUsage {
  const sum = (fn: (u: LanguageModelUsage) => number | undefined): number =>
    usages.reduce((acc, u) => acc + (fn(u) ?? 0), 0);
  const sumOptional = (fn: (u: LanguageModelUsage) => number | undefined): number | undefined => {
    const total = usages.reduce((acc, u) => acc + (fn(u) ?? 0), 0);
    if (total > 0) {
      return total;
    }
    return undefined;
  };
  return {
    inputTokens: sum((u) => u.inputTokens),
    outputTokens: sum((u) => u.outputTokens),
    totalTokens: sum((u) => u.totalTokens),
    inputTokenDetails: {
      noCacheTokens: sumOptional((u) => u.inputTokenDetails?.noCacheTokens),
      cacheReadTokens: sumOptional((u) => u.inputTokenDetails?.cacheReadTokens),
      cacheWriteTokens: sumOptional((u) => u.inputTokenDetails?.cacheWriteTokens),
    },
    outputTokenDetails: {
      textTokens: sumOptional((u) => u.outputTokenDetails?.textTokens),
      reasoningTokens: sumOptional((u) => u.outputTokenDetails?.reasoningTokens),
    },
  };
}
