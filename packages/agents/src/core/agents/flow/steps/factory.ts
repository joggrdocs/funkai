import { isNil, isNotNil } from "es-toolkit";
import { isObject } from "es-toolkit/compat";

import {
  buildToolCallId,
  createToolCallMessage,
  createToolResultMessage,
} from "@/core/agents/flow/messages.js";
import type { AgentStepConfig } from "@/core/agents/flow/steps/agent.js";
import type { AllConfig } from "@/core/agents/flow/steps/all.js";
import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import type { EachConfig } from "@/core/agents/flow/steps/each.js";
import type { MapConfig } from "@/core/agents/flow/steps/map.js";
import type { RaceConfig } from "@/core/agents/flow/steps/race.js";
import type { ReduceConfig } from "@/core/agents/flow/steps/reduce.js";
import type { StepResult, StepError } from "@/core/agents/flow/steps/result.js";
import type { StepConfig } from "@/core/agents/flow/steps/step.js";
import type { WhileConfig } from "@/core/agents/flow/steps/while.js";
/* oxlint-disable import/max-dependencies -- step factory requires many internal modules */
import type { GenerateResult, StreamResult } from "@/core/agents/types.js";
import type { TokenUsage } from "@/core/provider/types.js";
import type { AgentChainEntry, StepFinishEvent, StepInfo, StreamPart } from "@/core/types.js";
import type { Context } from "@/lib/context.js";
import { fireHooks } from "@/lib/hooks.js";
import type { TraceEntry, OperationType } from "@/lib/trace.js";
import { toError } from "@/utils/error.js";

/**
 * Options for {@link createStepBuilder}.
 */
export interface StepBuilderOptions {
  /**
   * Internal execution context.
   *
   * Provides the abort signal, logger, and trace array.
   */
  ctx: Context;

  /**
   * Parent flow agent hooks forwarded to each step.
   *
   * These fire after the step's own hooks, giving the flow agent
   * visibility into every `$` call.
   */
  parentHooks?: {
    onStepStart?: (event: { step: StepInfo }) => void | Promise<void>;
    onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
  };

  /**
   * Stream writer for emitting typed `StreamPart` events.
   *
   * When provided, step start/finish events are written as typed
   * AI SDK stream events. Used by `flowAgent.stream()` to pipe
   * step events through the readable stream.
   */
  writer?: WritableStreamDefaultWriter<StreamPart>;

  /**
   * Agent ancestry chain from root to the current flow agent.
   *
   * Attached to every `StepInfo` and `StepFinishEvent` so hook
   * consumers can trace which agent produced the event. Also
   * forwarded to sub-agents called via `$.agent()`.
   *
   * @internal Framework-only — not exposed to users.
   */
  agentChain?: readonly AgentChainEntry[];
}

/**
 * Mutable ref for globally unique step indices within a flow agent.
 */
interface IndexRef {
  current: number;
}

/**
 * Create a `StepBuilder` (`$`) instance.
 *
 * The returned builder is the `$` object passed into every flow agent
 * handler and step callback. It owns the full step lifecycle:
 * trace registration, hook firing, error wrapping,
 * and `StepResult<T>` construction.
 *
 * @param options - Factory configuration with context, optional parent
 *   hooks, and optional stream writer.
 * @returns A `StepBuilder` instance.
 */
export function createStepBuilder(options: StepBuilderOptions): StepBuilder {
  const indexRef: IndexRef = { current: 0 };
  return createStepBuilderInternal(options, indexRef);
}

/**
 * Internal factory that accepts a shared index ref.
 *
 * Child builders (created for nested `$` in callbacks) share
 * the same ref so step indices are globally unique.
 */
function createStepBuilderInternal(options: StepBuilderOptions, indexRef: IndexRef): StepBuilder {
  const { ctx, parentHooks, writer, agentChain } = options;

  /**
   * Core step primitive — every other method delegates here.
   */
  async function step<T>(config: StepConfig<T>): Promise<StepResult<T>> {
    const onFinishHandler = buildOnFinishHandler<T>(config.onFinish);

    return executeStep<T>({
      id: config.id,
      type: "step",
      execute: config.execute,
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  /**
   * Shared lifecycle for all step types.
   */
  async function executeStep<T>(params: {
    id: string;
    type: OperationType;
    execute: (args: { $: StepBuilder }) => Promise<T>;
    input?: unknown;
    onStart?: (event: { id: string }) => void | Promise<void>;
    onFinish?: (event: { id: string; result: unknown; duration: number }) => void | Promise<void>;
    onError?: (event: { id: string; error: Error }) => void | Promise<void>;
  }): Promise<StepResult<T>> {
    const { id, type, execute, input, onStart, onFinish, onError } = params;

    const stepInfo: StepInfo = { id, index: indexRef.current++, type, agentChain };
    const startedAt = Date.now();

    const childTrace: TraceEntry[] = [];
    const childCtx: Context = {
      signal: ctx.signal,
      log: ctx.log.child({ stepId: id }),
      trace: childTrace,
      messages: ctx.messages,
    };
    const child$ = createStepBuilderInternal(
      { ctx: childCtx, parentHooks, writer, agentChain },
      indexRef,
    );

    // Build synthetic tool-call message and push to context
    const toolCallId = buildToolCallId(id, stepInfo.index);
    ctx.messages.push(createToolCallMessage(toolCallId, id, input));

    // Write tool-call event to stream if writer is available
    if (isNotNil(writer)) {
      writer
        .write({
          type: "tool-call",
          toolCallId,
          toolName: id,
          input: input ?? {},
        } as StreamPart)
        /* V8 ignore start -- defensive; writer.write rarely rejects in practice */
        .catch((error) => {
          ctx.log.warn({ error, toolCallId }, "failed to write tool-call event to stream");
        });
      /* V8 ignore stop */
    }

    const onStartHook = buildHookCallback(onStart, (fn) => fn({ id }));
    const parentOnStepStartHook = buildParentHookCallback(parentHooks, "onStepStart", (fn) =>
      fn({ step: stepInfo }),
    );

    await fireHooks(ctx.log, onStartHook, parentOnStepStartHook);

    try {
      const value = await execute({ $: child$ });
      const finishedAt = Date.now();
      const duration = finishedAt - startedAt;

      const usage: TokenUsage | undefined = extractStepUsage(type, value);

      const traceRecord: TraceEntry = {
        id,
        type,
        input,
        startedAt,
        finishedAt,
        children: childTrace,
        output: value,
        ...(isNotNil(usage) && { usage }),
      };
      ctx.trace.push(traceRecord);

      // Push synthetic tool-result message
      ctx.messages.push(createToolResultMessage(toolCallId, id, value));

      // Write tool-result event to stream
      if (isNotNil(writer)) {
        writer
          .write({
            type: "tool-result",
            toolCallId,
            toolName: id,
            input: input ?? {},
            output: value ?? null,
          } as StreamPart)
          /* V8 ignore start -- defensive; writer.write rarely rejects in practice */
          .catch((error) => {
            ctx.log.warn({ error, toolCallId }, "failed to write tool-result event to stream");
          });
        /* V8 ignore stop */
      }

      const onFinishHook = buildHookCallback(onFinish, (fn) =>
        fn({ id, result: value as T, duration }),
      );
      const parentOnStepFinishHook = buildParentHookCallback(parentHooks, "onStepFinish", (fn) =>
        fn({ step: stepInfo, result: value, duration, agentChain }),
      );

      await fireHooks(ctx.log, onFinishHook, parentOnStepFinishHook);

      return { ok: true, value, step: stepInfo, duration } as StepResult<T>;
    } catch (caughtError) {
      const error = toError(caughtError);
      const finishedAt = Date.now();
      const duration = finishedAt - startedAt;

      ctx.trace.push({
        id,
        type,
        input,
        startedAt,
        finishedAt,
        children: childTrace,
        error,
      });

      const stepError: StepError = {
        code: "STEP_ERROR",
        message: error.message,
        cause: error,
        stepId: id,
      };

      // Push synthetic tool-result message for error
      ctx.messages.push(createToolResultMessage(toolCallId, id, { error: error.message }, true));

      // Write error tool-result event to stream
      if (isNotNil(writer)) {
        writer
          .write({
            type: "tool-result",
            toolCallId,
            toolName: id,
            input: input ?? {},
            output: { error: error.message },
          } as StreamPart)
          /* V8 ignore start -- defensive; writer.write rarely rejects in practice */
          .catch((writeError) => {
            ctx.log.warn(
              { error: writeError, toolCallId },
              "failed to write error tool-result event to stream",
            );
          });
        /* V8 ignore stop */
      }

      const onErrorHook = buildHookCallback(onError, (fn) => fn({ id, error }));
      const parentOnStepFinishHook = buildParentHookCallback(parentHooks, "onStepFinish", (fn) =>
        fn({ step: stepInfo, result: undefined, duration, agentChain }),
      );

      await fireHooks(ctx.log, onErrorHook, parentOnStepFinishHook);

      return { ok: false, error: stepError, step: stepInfo, duration } as StepResult<T>;
    }
  }

  async function agent<TInput>(
    config: AgentStepConfig<TInput>,
  ): Promise<StepResult<GenerateResult>> {
    const onFinishHandler = buildOnFinishHandler<GenerateResult>(config.onFinish);

    return executeStep<GenerateResult>({
      id: config.id,
      type: "agent",
      input: config.input,
      execute: async () => {
        // Forward fixed-type step hooks and agent chain to sub-agent.
        // Merge parent + child hooks so neither side is clobbered.
        const mergedHooks = mergeStepHooks(parentHooks, config.config);
        const agentParams = {
          ...config.config,
          input: config.input,
          signal: ctx.signal,
          logger: ctx.log.child({ stepId: config.id }),
          ...mergedHooks,
          agentChain,
        };

        // When stream: true and a writer is available, use agent.stream()
        // To pipe events through the parent flow's stream
        if (config.stream && isNotNil(writer)) {
          const streamResult = await config.agent.stream(agentParams);
          if (!streamResult.ok) {
            throw streamResult.error.cause ?? new Error(streamResult.error.message);
          }
          // Safe after the `!streamResult.ok` guard above — the Result union
          // Doesn't spread StreamResult props at the type level, so we cast.
          const full = streamResult as unknown as StreamResult & {
            ok: true;
          };

          // Forward text-delta events from sub-agent to parent stream
          for await (const part of full.fullStream) {
            if (part.type === "text-delta") {
              await writer.write(part);
            }
          }

          // Await the final results
          return {
            output: await full.output,
            messages: await full.messages,
            usage: await full.usage,
            finishReason: await full.finishReason,
          };
        }

        const result = await config.agent.generate(agentParams);
        if (!result.ok) {
          throw result.error.cause ?? new Error(result.error.message);
        }
        // Runnable.generate() types only { output }, but Agent.generate()
        // Returns full GenerateResult at runtime including messages, usage, finishReason.
        const full = result as unknown as GenerateResult & {
          ok: true;
        };
        return {
          output: full.output,
          messages: full.messages,
          usage: full.usage,
          finishReason: full.finishReason,
        };
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  async function map<T, R>(config: MapConfig<T, R>): Promise<StepResult<R[]>> {
    const onFinishHandler = buildOnFinishHandler<R[]>(config.onFinish);

    return executeStep<R[]>({
      id: config.id,
      type: "map",
      input: config.input,
      execute: async ({ $ }) => {
        const { concurrency } = config;
        if (isNotNil(concurrency) && concurrency !== Infinity && concurrency > 0) {
          return poolMap(config.input, concurrency, ctx.signal, (item, index) =>
            config.execute({ item, index, $ }),
          );
        }
        return Promise.all(config.input.map((item, index) => config.execute({ item, index, $ })));
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  async function each<T>(config: EachConfig<T>): Promise<StepResult<void>> {
    const onFinishHandler = buildOnFinishHandlerVoid(config.onFinish);

    return executeStep<void>({
      id: config.id,
      type: "each",
      input: config.input,
      execute: async ({ $ }) => {
        for (const [i, item] of config.input.entries()) {
          if (ctx.signal.aborted) {
            throw new Error("Aborted");
          }
          // oxlint-disable-next-line no-await-in-loop - sequential by design
          await config.execute({ item, index: i, $ });
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  async function reduce<T, R>(config: ReduceConfig<T, R>): Promise<StepResult<R>> {
    const onFinishHandler = buildOnFinishHandler<R>(config.onFinish);

    return executeStep<R>({
      id: config.id,
      type: "reduce",
      input: config.input,
      execute: async ({ $ }) => {
        const result = await reduceSequential(
          config.input,
          config.initial,
          ctx.signal,
          (item, accumulator, index) => config.execute({ item, accumulator, index, $ }),
        );
        return result;
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  async function whileStep<T>(config: WhileConfig<T>): Promise<StepResult<T | undefined>> {
    const onFinishHandler = buildOnFinishHandler<T | undefined>(config.onFinish);

    return executeStep<T | undefined>({
      id: config.id,
      type: "while",
      execute: async ({ $ }) => {
        const result = await whileSequential(config.condition, ctx.signal, (index) =>
          config.execute({ index, $ }),
        );
        return result;
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  async function all(config: AllConfig): Promise<StepResult<unknown[]>> {
    const onFinishHandler = buildOnFinishHandler<unknown[]>(config.onFinish);

    return executeStep<unknown[]>({
      id: config.id,
      type: "all",
      execute: async ({ $ }) => {
        const ac = new AbortController();
        // Link to parent signal so cancellation propagates
        const onAbort = () => ac.abort();
        ctx.signal.addEventListener("abort", onAbort, { once: true });
        try {
          return await Promise.all(config.entries.map((factory) => factory(ac.signal, $)));
        } catch (error) {
          ac.abort();
          throw error;
        } finally {
          ctx.signal.removeEventListener("abort", onAbort);
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  async function race(config: RaceConfig): Promise<StepResult<unknown>> {
    const onFinishHandler = buildOnFinishHandlerRace(config.onFinish);

    return executeStep<unknown>({
      id: config.id,
      type: "race",
      execute: async ({ $ }) => {
        const ac = new AbortController();
        // Link to parent signal so cancellation propagates
        const onAbort = () => ac.abort();
        ctx.signal.addEventListener("abort", onAbort, { once: true });
        try {
          return await Promise.race(config.entries.map((factory) => factory(ac.signal, $)));
        } finally {
          // Cancel losing entries (on success) or remaining entries (on error)
          ac.abort();
          ctx.signal.removeEventListener("abort", onAbort);
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    });
  }

  return {
    step,
    agent,
    map,
    each,
    reduce,
    while: whileStep,
    all,
    race,
  };
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Extract token usage from an agent step result, if present.
 *
 * @private
 */
function extractStepUsage(type: OperationType, value: unknown): TokenUsage | undefined {
  if (type === "agent" && isObject(value) && Object.hasOwn(value, "usage")) {
    return (value as unknown as { usage: TokenUsage }).usage;
  }
  return undefined;
}

/**
 * Wrap a hook handler into a nullary callback for `fireHooks`.
 *
 * @private
 */
function buildHookCallback<F extends ((...args: never[]) => void | Promise<void>) | undefined>(
  handler: F,
  invoke: (fn: NonNullable<F>) => void | Promise<void>,
): (() => void | Promise<void>) | undefined {
  if (isNotNil(handler)) {
    // TypeScript can't narrow generic types through type guards;
    // The isNotNil check above guarantees handler is NonNullable<F>
    return () => invoke(handler as NonNullable<F>);
  }
  return undefined;
}

/**
 * Wrap a parent-level step hook into a nullary callback for `fireHooks`.
 *
 * @private
 */
function buildParentHookCallback<K extends "onStepStart" | "onStepFinish">(
  hooks: StepBuilderOptions["parentHooks"],
  key: K,
  invoke: (
    fn: NonNullable<NonNullable<StepBuilderOptions["parentHooks"]>[K]>,
  ) => void | Promise<void>,
): (() => void | Promise<void>) | undefined {
  if (isNil(hooks)) {
    return undefined;
  }
  // eslint-disable-next-line security/detect-object-injection -- Key is a controlled internal hook name, not user input
  const fn = hooks[key];
  if (isNil(fn)) {
    return undefined;
  }
  // TypeScript can't narrow generic indexed types through type guards;
  // The isNil check above guarantees fn is NonNullable
  return () => invoke(fn as NonNullable<typeof fn>);
}

/**
 * Build a typed onFinish handler that forwards the step result.
 *
 * @private
 */
function buildOnFinishHandler<T>(
  onFinish?: (event: { id: string; result: T; duration: number }) => void | Promise<void>,
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (isNil(onFinish)) {
    return undefined;
  }
  return (event) => onFinish({ id: event.id, result: event.result as T, duration: event.duration });
}

/**
 * Build an onFinish handler for void steps that omits the result.
 *
 * @private
 */
function buildOnFinishHandlerVoid(
  onFinish?: (event: { id: string; duration: number }) => void | Promise<void>,
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (isNil(onFinish)) {
    return undefined;
  }
  return (event) => onFinish({ id: event.id, duration: event.duration });
}

/**
 * Build an onFinish handler for race steps that passes through the raw result.
 *
 * @private
 */
function buildOnFinishHandlerRace(
  onFinish?: (event: { id: string; result: unknown; duration: number }) => void | Promise<void>,
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (isNil(onFinish)) {
    return undefined;
  }
  return (event) => onFinish({ id: event.id, result: event.result, duration: event.duration });
}

/**
 * Merge parent flow step hooks with delegated-agent step hooks.
 *
 * When both parent and child define the same hook, the merged callback
 * fires the child hook first, then the parent hook. Only defined hooks
 * are included in the result so `undefined` values never clobber
 * a child-only hook via object spread.
 *
 * @private
 */
function mergeStepHooks(
  parentHooks: StepBuilderOptions["parentHooks"],
  childConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  type StepStartHook = (event: { step: StepInfo }) => void | Promise<void>;
  type StepFinishHook = (event: StepFinishEvent) => void | Promise<void>;

  let parentStart: StepStartHook | undefined;
  let parentFinish: StepFinishHook | undefined;
  if (isNotNil(parentHooks)) {
    parentStart = parentHooks.onStepStart;
    parentFinish = parentHooks.onStepFinish;
  }

  let childStart: StepStartHook | undefined;
  let childFinish: StepFinishHook | undefined;
  if (isNotNil(childConfig)) {
    childStart = childConfig.onStepStart as StepStartHook | undefined;
    childFinish = childConfig.onStepFinish as StepFinishHook | undefined;
  }

  const result: Record<string, unknown> = {};

  if (isNotNil(parentStart) && isNotNil(childStart)) {
    result.onStepStart = async (event: { step: StepInfo }) => {
      await childStart(event);
      await parentStart(event);
    };
  } else if (isNotNil(parentStart)) {
    result.onStepStart = parentStart;
  } else if (isNotNil(childStart)) {
    result.onStepStart = childStart;
  }

  if (isNotNil(parentFinish) && isNotNil(childFinish)) {
    result.onStepFinish = async (event: StepFinishEvent) => {
      await childFinish(event);
      await parentFinish(event);
    };
  } else if (isNotNil(parentFinish)) {
    result.onStepFinish = parentFinish;
  } else if (isNotNil(childFinish)) {
    result.onStepFinish = childFinish;
  }

  return result;
}

/**
 * Sequentially reduce items with abort support using tail-recursive iteration.
 *
 * @private
 */
async function reduceSequential<T, R>(
  items: readonly T[],
  initial: R,
  signal: AbortSignal,
  fn: (item: T, accumulator: R, index: number) => Promise<R>,
): Promise<R> {
  async function loop(accumulator: R, index: number): Promise<R> {
    if (index >= items.length) {
      return accumulator;
    }
    if (signal.aborted) {
      throw new Error("Aborted");
    }
    // eslint-disable-next-line security/detect-object-injection -- Array index is a locally computed number, not user input
    const next = await fn(items[index] as T, accumulator, index);
    return loop(next, index + 1);
  }
  return loop(initial, 0);
}

/**
 * Sequentially execute a callback while a condition holds, with abort support.
 *
 * @private
 */
async function whileSequential<T>(
  condition: (state: { value: T | undefined; index: number }) => boolean,
  signal: AbortSignal,
  fn: (index: number) => Promise<T>,
): Promise<T | undefined> {
  async function loop(value: T | undefined, index: number): Promise<T | undefined> {
    if (!condition({ value, index })) {
      return value;
    }
    if (signal.aborted) {
      throw new Error("Aborted");
    }
    const next = await fn(index);
    return loop(next, index + 1);
  }
  return loop(undefined, 0);
}

/**
 * Worker-pool map with bounded concurrency.
 *
 * Runs `fn` over `items` with at most `concurrency` concurrent
 * executions. Results are returned in input order.
 *
 * @private
 */
async function poolMap<T, R>(
  items: readonly T[],
  concurrency: number,
  signal: AbortSignal,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = Array.from<R>({ length: items.length });
  const indexRef = { current: 0 };

  async function worker(): Promise<void> {
    while (indexRef.current < items.length) {
      if (signal.aborted) {
        throw new Error("Aborted");
      }
      const i = indexRef.current++;
      // eslint-disable-next-line no-await-in-loop, security/detect-object-injection -- Sequential execution by design; array indices are locally computed numbers
      results[i] = await fn(items[i] as T, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
