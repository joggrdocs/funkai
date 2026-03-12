import type { AsyncIterableStream } from "ai";

import type { Message, StreamPart } from "@/core/agents/base/types.js";
import { createAssistantMessage, createUserMessage } from "@/core/agents/flow/messages.js";
import type {
  FlowAgent,
  FlowAgentConfig,
  FlowAgentGenerateResult,
  FlowAgentHandler,
  FlowAgentOverrides,
  InternalFlowAgentOptions,
} from "@/core/agents/flow/types.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { Logger } from "@/core/logger.js";
import { sumTokenUsage } from "@/core/provider/usage.js";
import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import { createStepBuilder } from "@/core/agents/flow/steps/factory.js";
import type { Context } from "@/lib/context.js";
import { fireHooks } from "@/lib/hooks.js";
import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";
import type { TraceEntry } from "@/lib/trace.js";
import { collectUsages, snapshotTrace } from "@/lib/trace.js";
import { toError } from "@/utils/error.js";
import type { Result } from "@/utils/result.js";

/**
 * Wrap a nullable hook into a callback for `fireHooks`.
 */
function wrapHook<T>(
  hookFn: ((event: T) => void | Promise<void>) | undefined,
  event: T,
): (() => void | Promise<void>) | undefined {
  if (hookFn !== undefined) {
    return () => hookFn(event);
  }
  return undefined;
}

/**
 * Resolve the logger for a single flow agent execution.
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
export function flowAgent<TInput, TOutput>(
  config: FlowAgentConfig<TInput, TOutput>,
  handler: FlowAgentHandler<TInput, TOutput>,
  _internal?: InternalFlowAgentOptions,
): FlowAgent<TInput, TOutput> {
  const baseLogger = config.logger ?? createDefaultLogger();

  async function generate(
    input: TInput,
    overrides?: FlowAgentOverrides,
  ): Promise<Result<FlowAgentGenerateResult<TOutput>>> {
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

    const startedAt = Date.now();
    const log = resolveFlowAgentLogger(baseLogger, config.name, overrides);

    const signal = (overrides && overrides.signal) || new AbortController().signal;
    const trace: TraceEntry[] = [];
    const messages: Message[] = [];
    const ctx: Context = { signal, log, trace, messages };

    const base$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: config.onStepStart,
        onStepFinish: config.onStepFinish,
      },
    });

    const $ = augmentStepBuilder(base$, ctx, _internal);

    // Push user message
    messages.push(createUserMessage(input));

    await fireHooks(
      log,
      wrapHook(config.onStart, { input }),
      wrapHook(overrides && overrides.onStart, { input }),
    );

    log.debug("flowAgent.generate start", { name: config.name });

    try {
      const output = await handler({ input, $, log });

      const outputParsed = config.output.safeParse(output);
      if (!outputParsed.success) {
        return {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Output validation failed: ${outputParsed.error.message}`,
          },
        };
      }

      const duration = Date.now() - startedAt;

      // Push final assistant message
      messages.push(createAssistantMessage(output));

      const usage = sumTokenUsage(collectUsages(trace));
      const frozenTrace = snapshotTrace(trace);

      const result: FlowAgentGenerateResult<TOutput> = {
        output,
        messages: [...messages],
        usage,
        finishReason: "stop",
        trace: frozenTrace,
        duration,
      };

      await fireHooks(
        log,
        wrapHook(config.onFinish, { input, result, duration }),
        wrapHook(overrides && overrides.onFinish, {
          input,
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
        wrapHook(config.onError, { input, error }),
        wrapHook(overrides && overrides.onError, { input, error }),
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
  ): Promise<Result<import("@/core/agents/base/types.js").StreamResult<TOutput>>> {
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

    const startedAt = Date.now();
    const log = resolveFlowAgentLogger(baseLogger, config.name, overrides);

    const signal = (overrides && overrides.signal) || new AbortController().signal;
    const trace: TraceEntry[] = [];
    const messages: Message[] = [];
    const ctx: Context = { signal, log, trace, messages };

    const { readable, writable } = new TransformStream<StreamPart, StreamPart>();
    const writer = writable.getWriter();

    const base$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: config.onStepStart,
        onStepFinish: config.onStepFinish,
      },
      writer,
    });

    const $ = augmentStepBuilder(base$, ctx, _internal);

    // Push user message
    messages.push(createUserMessage(input));

    await fireHooks(
      log,
      wrapHook(config.onStart, { input }),
      wrapHook(overrides && overrides.onStart, { input }),
    );

    log.debug("flowAgent.stream start", { name: config.name });

    // Run handler in background, piping results through stream
    const done = (async () => {
      try {
        const output = await handler({ input, $, log });

        const outputParsed = config.output.safeParse(output);
        if (!outputParsed.success) {
          throw new Error(`Output validation failed: ${outputParsed.error.message}`);
        }

        const duration = Date.now() - startedAt;

        // Push final assistant message
        messages.push(createAssistantMessage(output));

        const usage = sumTokenUsage(collectUsages(trace));

        const result: FlowAgentGenerateResult<TOutput> = {
          output,
          messages: [...messages],
          usage,
          finishReason: "stop",
          trace: snapshotTrace(trace),
          duration,
        };

        await fireHooks(
          log,
          wrapHook(config.onFinish, { input, result, duration }),
          wrapHook(overrides && overrides.onFinish, {
            input,
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
        await writer.write({ type: "error", error } as StreamPart).catch(() => {});
        await writer.close().catch(() => {});

        await fireHooks(
          log,
          wrapHook(config.onError, { input, error }),
          wrapHook(overrides && overrides.onError, { input, error }),
        );

        throw error;
      }
    })();

    // Catch stream errors to prevent unhandled rejections
    done.catch(() => {});

    const streamResult: import("@/core/agents/base/types.js").StreamResult<TOutput> = {
      output: done.then((r) => r.output),
      messages: done.then((r) => r.messages),
      usage: done.then((r) => r.usage),
      finishReason: done.then((r) => r.finishReason),
      fullStream: readable as AsyncIterableStream<StreamPart>,
    };

    return { ok: true, ...streamResult };
  }

  const agent: FlowAgent<TInput, TOutput> = {
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
