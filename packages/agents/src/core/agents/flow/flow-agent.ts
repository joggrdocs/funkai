import type { AsyncIterableStream } from "ai";

import type { Message, StreamPart } from "@/core/agents/base/types.js";
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
  FlowAgentOverrides,
  InternalFlowAgentOptions,
  StepInfo,
} from "@/core/agents/flow/types.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { Logger } from "@/core/logger.js";
import { sumTokenUsage } from "@/core/provider/usage.js";
import type { Context } from "@/lib/context.js";
import { fireHooks, wrapHook } from "@/lib/hooks.js";
import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";
import type { TraceEntry } from "@/lib/trace.js";
import { collectUsages, snapshotTrace } from "@/lib/trace.js";
import { toError } from "@/utils/error.js";
import type { Result } from "@/utils/result.js";

/** Hook signature for step-finish events. @private */
type StepFinishHook = (event: { step: StepInfo; result: unknown; duration: number }) => void | Promise<void>;

/**
 * Build a merged `onStepFinish` parent hook that fires both the config-level
 * and per-call override hooks sequentially (config first, then override).
 *
 * Returns `undefined` when neither hook is provided, so `createStepBuilder`
 * skips the callback entirely.
 *
 * @param log - Logger for `fireHooks` error reporting.
 * @param configHook - The hook from `FlowAgentConfig`.
 * @param overrideHook - The hook from `FlowAgentOverrides`.
 * @returns A merged hook callback, or `undefined`.
 *
 * @private
 */
function buildMergedStepFinishHook(
  log: Logger,
  configHook: StepFinishHook | undefined,
  overrideHook: StepFinishHook | undefined,
): StepFinishHook | undefined {
  if (configHook === undefined && overrideHook === undefined) {
    return undefined;
  }
  return async (event) => {
    await fireHooks(
      log,
      wrapHook(configHook, event),
      wrapHook(overrideHook, event),
    );
  };
}

/**
 * Resolve the logger for a single flow agent execution.
 *
 * @private
 */
function resolveFlowAgentLogger(
  base: Logger,
  flowAgentId: string,
  overrides?: FlowAgentOverrides,
): Logger {
  const override = overrides && overrides.logger;
  return (override ?? base).child({ flowAgentId });
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
 * `.stream()`, same `.fn()`. Same `GenerateResult` return type. Same
 * `messages` array. The only difference is internal: an `agent` runs
 * an LLM tool loop, a `flowAgent` runs your handler function.
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
  const baseLogger = config.logger ?? createDefaultLogger();

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
    messages: Message[],
  ): { ok: true; value: unknown } | { ok: false; message: string } {
    if (config.output !== undefined) {
      const outputParsed = config.output.safeParse(output);
      if (!outputParsed.success) {
        return { ok: false, message: `Output validation failed: ${outputParsed.error.message}` };
      }
      messages.push(createAssistantMessage(outputParsed.data));
      return { ok: true, value: outputParsed.data };
    }
    const text = collectTextFromMessages(messages);
    messages.push(createAssistantMessage(text));
    return { ok: true, value: text };
  }

  async function generate(
    input: TInput,
    overrides?: FlowAgentOverrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  ): Promise<Result<FlowAgentGenerateResult<any>>> {
    const inputParsed = config.input.safeParse(input);
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
    const log = resolveFlowAgentLogger(baseLogger, config.name, overrides);

    const signal = (overrides && overrides.signal) || new AbortController().signal;
    const trace: TraceEntry[] = [];
    const messages: Message[] = [];
    const ctx: Context = { signal, log, trace, messages };

    const mergedOnStepFinish = buildMergedStepFinishHook(
      log,
      config.onStepFinish,
      overrides && overrides.onStepFinish,
    );

    const base$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: config.onStepStart,
        onStepFinish: mergedOnStepFinish,
      },
    });

    const $ = augmentStepBuilder(base$, ctx, _internal);

    // Push user message
    messages.push(createUserMessage(parsedInput));

    await fireHooks(
      log,
      wrapHook(config.onStart, { input: parsedInput }),
      wrapHook(overrides && overrides.onStart, { input: parsedInput }),
    );

    log.debug("flowAgent.generate start", { name: config.name });

    try {
      const output = await (handler as FlowAgentHandler<TInput, TOutput>)({
        input: parsedInput,
        $,
        log,
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

      const usage = sumTokenUsage(collectUsages(trace));
      const frozenTrace = snapshotTrace(trace);

      const result: FlowAgentGenerateResult<unknown> = {
        output: resolvedOutput,
        messages: [...messages],
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
        wrapHook(overrides && overrides.onFinish, {
          input: parsedInput,
          result: result as import("@/core/agents/base/types.js").GenerateResult,
          duration,
        }),
      );

      log.debug("flowAgent.generate finish", { name: config.name, duration });

      return { ok: true, ...result };
    } catch (thrown) {
      const error = toError(thrown);
      const duration = Date.now() - startedAt;

      log.error("flowAgent.generate error", { name: config.name, error: error.message, duration });

      await fireHooks(
        log,
        wrapHook(config.onError, { input: parsedInput, error }),
        wrapHook(overrides && overrides.onError, { input: parsedInput, error }),
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
    input: TInput,
    overrides?: FlowAgentOverrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  ): Promise<Result<import("@/core/agents/base/types.js").StreamResult<any>>> {
    const inputParsed = config.input.safeParse(input);
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
    const log = resolveFlowAgentLogger(baseLogger, config.name, overrides);

    const signal = (overrides && overrides.signal) || new AbortController().signal;
    const trace: TraceEntry[] = [];
    const messages: Message[] = [];
    const ctx: Context = { signal, log, trace, messages };

    const { readable, writable } = new TransformStream<StreamPart, StreamPart>();
    const writer = writable.getWriter();

    const mergedOnStepFinish = buildMergedStepFinishHook(
      log,
      config.onStepFinish,
      overrides && overrides.onStepFinish,
    );

    const base$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: config.onStepStart,
        onStepFinish: mergedOnStepFinish,
      },
      writer,
    });

    const $ = augmentStepBuilder(base$, ctx, _internal);

    // Push user message
    messages.push(createUserMessage(parsedInput));

    await fireHooks(
      log,
      wrapHook(config.onStart, { input: parsedInput }),
      wrapHook(overrides && overrides.onStart, { input: parsedInput }),
    );

    log.debug("flowAgent.stream start", { name: config.name });

    // Run handler in background, piping results through stream
    const done = (async () => {
      try {
        const output = await (handler as FlowAgentHandler<TInput, TOutput>)({
          input: parsedInput,
          $,
          log,
        });

        const outputResult = resolveFlowOutput(output, messages);
        if (!outputResult.ok) {
          throw new Error(outputResult.message);
        }
        const resolvedOutput = outputResult.value;

        const duration = Date.now() - startedAt;

        const usage = sumTokenUsage(collectUsages(trace));

        const result: FlowAgentGenerateResult<unknown> = {
          output: resolvedOutput,
          messages: [...messages],
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
          wrapHook(overrides && overrides.onFinish, {
            input: parsedInput,
            result: result as import("@/core/agents/base/types.js").GenerateResult,
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
      } catch (thrown) {
        const error = toError(thrown);
        const duration = Date.now() - startedAt;

        log.error("flowAgent.stream error", { name: config.name, error: error.message, duration });

        // Emit error event and close the stream
        /* v8 ignore start -- defensive; writer rarely rejects in practice */
        await writer.write({ type: "error", error } as StreamPart).catch((err) => {
          log.debug("failed to write error event to stream", { err });
        });
        await writer.close().catch((err) => {
          log.debug("failed to close stream writer", { err });
        });
        /* v8 ignore stop */

        await fireHooks(
          log,
          wrapHook(config.onError, { input: parsedInput, error }),
          wrapHook(overrides && overrides.onError, { input: parsedInput, error }),
        );

        throw error;
      }
    })();

    // Catch stream errors to prevent unhandled rejections
    done.catch(() => {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
    const streamResult: import("@/core/agents/base/types.js").StreamResult<any> = {
      output: done.then((r) => r.output),
      messages: done.then((r) => r.messages),
      usage: done.then((r) => r.usage),
      finishReason: done.then((r) => r.finishReason),
      fullStream: readable as AsyncIterableStream<StreamPart>,
    };

    return { ok: true, ...streamResult };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
  const agent: FlowAgent<TInput, any> = {
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
