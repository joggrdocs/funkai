import {
  buildToolCallId,
  createToolCallMessage,
  createToolResultMessage,
  formatToolCallEvent,
  formatToolResultEvent,
} from '@/core/flow-agent/messages.js'
import type { AgentStepConfig } from '@/core/workflows/steps/agent.js'
import type { AllConfig } from '@/core/workflows/steps/all.js'
import type { StepBuilder } from '@/core/workflows/steps/builder.js'
import type { EachConfig } from '@/core/workflows/steps/each.js'
import type { MapConfig } from '@/core/workflows/steps/map.js'
import type { RaceConfig } from '@/core/workflows/steps/race.js'
import type { ReduceConfig } from '@/core/workflows/steps/reduce.js'
import type { StepResult, StepError } from '@/core/workflows/steps/result.js'
import type { StepConfig } from '@/core/workflows/steps/step.js'
import type { WhileConfig } from '@/core/workflows/steps/while.js'
import type { StepInfo, StepEvent } from '@/core/workflows/types.js'
import type { Context } from '@/lib/context.js'
import { fireHooks } from '@/lib/hooks.js'
import type { TraceEntry, OperationType } from '@/lib/trace.js'
import { toError } from '@/utils/error.js'

/**
 * Options for {@link createStepBuilder}.
 */
export interface StepBuilderOptions {
  /**
   * Internal execution context.
   *
   * Provides the abort signal, logger, and trace array.
   */
  ctx: Context

  /**
   * Parent workflow hooks forwarded to each step.
   *
   * These fire after the step's own hooks, giving the workflow
   * visibility into every `$` call.
   */
  parentHooks?: {
    onStepStart?: (event: { step: StepInfo }) => void | Promise<void>
    onStepFinish?: (event: {
      step: StepInfo
      result: unknown
      duration: number
    }) => void | Promise<void>
  }

  /**
   * Emit a step event to the workflow's event stream.
   */
  emit?: (event: StepEvent) => void

  /**
   * Stream writer for emitting serialized tool-call events.
   *
   * When provided, step start/finish events are written as JSON
   * strings to this writer. Used by `flowAgent.stream()` to pipe
   * step events through the readable stream.
   */
  writer?: WritableStreamDefaultWriter<string>
}

/**
 * Mutable ref for globally unique step indices within a workflow.
 */
interface IndexRef {
  current: number
}

/**
 * Create a `StepBuilder` (`$`) instance.
 *
 * The returned builder is the `$` object passed into every workflow
 * handler and step callback. It owns the full step lifecycle:
 * trace registration, hook firing, error wrapping,
 * and `StepResult<T>` construction.
 *
 * @param options - Factory configuration with context, optional parent
 *   hooks, and optional event emitter.
 * @returns A `StepBuilder` instance.
 */
export function createStepBuilder(options: StepBuilderOptions): StepBuilder {
  const indexRef: IndexRef = { current: 0 }
  return createStepBuilderInternal(options, indexRef)
}

/**
 * Internal factory that accepts a shared index ref.
 *
 * Child builders (created for nested `$` in callbacks) share
 * the same ref so step indices are globally unique.
 */
function createStepBuilderInternal(options: StepBuilderOptions, indexRef: IndexRef): StepBuilder {
  const { ctx, parentHooks, emit, writer } = options

  /**
   * Core step primitive — every other method delegates here.
   */
  async function step<T>(config: StepConfig<T>): Promise<StepResult<T>> {
    const onFinishHandler = buildOnFinishHandler<T>(config.onFinish)

    return executeStep<T>({
      id: config.id,
      type: 'step',
      execute: config.execute,
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  /**
   * Shared lifecycle for all step types.
   */
  async function executeStep<T>(params: {
    id: string
    type: OperationType
    execute: (args: { $: StepBuilder }) => Promise<T>
    input?: unknown
    onStart?: (event: { id: string }) => void | Promise<void>
    onFinish?: (event: { id: string; result: unknown; duration: number }) => void | Promise<void>
    onError?: (event: { id: string; error: Error }) => void | Promise<void>
  }): Promise<StepResult<T>> {
    const { id, type, execute, input, onStart, onFinish, onError } = params

    const stepInfo: StepInfo = { id, index: indexRef.current++, type }
    const startedAt = Date.now()

    const childTrace: TraceEntry[] = []
    const traceEntry: TraceEntry = { id, type, input, startedAt, children: childTrace }
    ctx.trace.push(traceEntry)
    const childCtx: Context = {
      signal: ctx.signal,
      log: ctx.log.child({ stepId: id }),
      trace: childTrace,
      messages: ctx.messages,
    }
    const child$ = createStepBuilderInternal({ ctx: childCtx, parentHooks, emit, writer }, indexRef)

    // Build synthetic tool-call message and push to context
    const toolCallId = buildToolCallId(id, stepInfo.index)
    ctx.messages.push(createToolCallMessage(toolCallId, id, input))

    // Write tool-call event to stream if writer is available
    if (writer != null) {
      writer.write(formatToolCallEvent(toolCallId, id, input)).catch(() => {})
    }

    const onStartHook = buildHookCallback(onStart, (fn) => fn({ id }))
    const parentOnStepStartHook = buildParentHookCallback(parentHooks, 'onStepStart', (fn) =>
      fn({ step: stepInfo })
    )

    await fireHooks(ctx.log, onStartHook, parentOnStepStartHook)
    if (emit != null) {
      emit({ type: 'step:start', step: stepInfo })
    }

    try {
      const value = await execute({ $: child$ })
      const duration = Date.now() - startedAt

      traceEntry.output = value
      traceEntry.finishedAt = Date.now()
      if (value != null && typeof value === 'object' && 'usage' in value) {
        traceEntry.usage = (value as { usage: import('@/core/provider/types.js').TokenUsage }).usage
      }

      // Push synthetic tool-result message
      ctx.messages.push(createToolResultMessage(toolCallId, id, value))

      // Write tool-result event to stream
      if (writer != null) {
        writer.write(formatToolResultEvent(toolCallId, id, value)).catch(() => {})
      }

      const onFinishHook = buildHookCallback(onFinish, (fn) =>
        fn({ id, result: value as T, duration })
      )
      const parentOnStepFinishHook = buildParentHookCallback(parentHooks, 'onStepFinish', (fn) =>
        fn({ step: stepInfo, result: value, duration })
      )

      await fireHooks(ctx.log, onFinishHook, parentOnStepFinishHook)
      if (emit != null) {
        emit({ type: 'step:finish', step: stepInfo, result: value, duration })
      }

      return { ok: true, value, step: stepInfo, duration } as StepResult<T>
    } catch (thrown) {
      const error = toError(thrown)
      const duration = Date.now() - startedAt

      traceEntry.error = error
      traceEntry.finishedAt = Date.now()

      const stepError: StepError = {
        code: 'STEP_ERROR',
        message: error.message,
        cause: error,
        stepId: id,
      }

      // Push synthetic tool-result message for error
      ctx.messages.push(
        createToolResultMessage(toolCallId, id, { error: error.message }, true)
      )

      // Write error tool-result event to stream
      if (writer != null) {
        writer.write(
          formatToolResultEvent(toolCallId, id, { error: error.message }, true)
        ).catch(() => {})
      }

      const onErrorHook = buildHookCallback(onError, (fn) => fn({ id, error }))
      const parentOnStepFinishHook = buildParentHookCallback(parentHooks, 'onStepFinish', (fn) =>
        fn({ step: stepInfo, result: undefined, duration })
      )

      await fireHooks(ctx.log, onErrorHook, parentOnStepFinishHook)
      if (emit != null) {
        emit({ type: 'step:error', step: stepInfo, error })
      }

      return { ok: false, error: stepError, step: stepInfo, duration } as StepResult<T>
    }
  }

  async function agent<TInput>(
    config: AgentStepConfig<TInput>
  ): Promise<StepResult<import('@/core/agent/types.js').GenerateResult>> {
    const onFinishHandler = buildOnFinishHandlerWithCast<
      import('@/core/agent/types.js').GenerateResult
    >(config.onFinish)

    return executeStep<import('@/core/agent/types.js').GenerateResult>({
      id: config.id,
      type: 'agent',
      input: config.input,
      execute: async () => {
        const agentConfig = {
          signal: ctx.signal,
          ...config.config,
          logger: ctx.log.child({ stepId: config.id }),
        }

        // When stream: true and a writer is available, use agent.stream()
        // to pipe text through the parent flow's stream
        if (config.stream && writer != null) {
          const streamResult = await config.agent.stream(config.input, agentConfig)
          if (!streamResult.ok) {
            throw streamResult.error.cause ?? new Error(streamResult.error.message)
          }
          const full = streamResult as unknown as import('@/core/agent/types.js').StreamResult & {
            ok: true
          }

          // Pipe text chunks through the parent writer
          const reader = full.stream.getReader()
          try {
            while (true) {
              const { done: readerDone, value: chunk } = await reader.read()
              if (readerDone) break
              await writer.write(chunk)
            }
          } finally {
            reader.releaseLock()
          }

          // Await the final results
          return {
            output: await full.output,
            messages: await full.messages,
            usage: await full.usage,
            finishReason: await full.finishReason,
          }
        }

        const result = await config.agent.generate(config.input, agentConfig)
        if (!result.ok) {
          throw result.error.cause ?? new Error(result.error.message)
        }
        // Runnable.generate() types only { output }, but Agent.generate()
        // returns full GenerateResult at runtime including messages, usage, finishReason.
        const full = result as unknown as import('@/core/agent/types.js').GenerateResult & {
          ok: true
        }
        return {
          output: full.output,
          messages: full.messages,
          usage: full.usage,
          finishReason: full.finishReason,
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  async function map<T, R>(config: MapConfig<T, R>): Promise<StepResult<R[]>> {
    const onFinishHandler = buildOnFinishHandlerWithCast<R[]>(config.onFinish)

    return executeStep<R[]>({
      id: config.id,
      type: 'map',
      input: config.input,
      execute: async ({ $ }) => {
        const concurrency = config.concurrency
        if (concurrency != null && concurrency !== Infinity) {
          return poolMap(config.input, concurrency, ctx.signal, (item, index) =>
            config.execute({ item, index, $ })
          )
        }
        return Promise.all(config.input.map((item, index) => config.execute({ item, index, $ })))
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  async function each<T>(config: EachConfig<T>): Promise<StepResult<void>> {
    const onFinishHandler = buildOnFinishHandlerVoid(config.onFinish)

    return executeStep<void>({
      id: config.id,
      type: 'each',
      input: config.input,
      execute: async ({ $ }) => {
        for (const [i, item] of config.input.entries()) {
          if (ctx.signal.aborted) {
            throw new Error('Aborted')
          }
          // oxlint-disable-next-line no-await-in-loop - sequential by design
          await config.execute({ item, index: i, $ })
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  async function reduce<T, R>(config: ReduceConfig<T, R>): Promise<StepResult<R>> {
    const onFinishHandler = buildOnFinishHandlerWithCast<R>(config.onFinish)

    return executeStep<R>({
      id: config.id,
      type: 'reduce',
      input: config.input,
      execute: async ({ $ }) => {
        const result = await reduceSequential(
          config.input,
          config.initial,
          ctx.signal,
          (item, accumulator, index) => config.execute({ item, accumulator, index, $ })
        )
        return result
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  async function whileStep<T>(config: WhileConfig<T>): Promise<StepResult<T | undefined>> {
    const onFinishHandler = buildOnFinishHandlerWithCast<T | undefined>(config.onFinish)

    return executeStep<T | undefined>({
      id: config.id,
      type: 'while',
      execute: async ({ $ }) => {
        const result = await whileSequential(config.condition, ctx.signal, (index) =>
          config.execute({ index, $ })
        )
        return result
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  async function all(config: AllConfig): Promise<StepResult<unknown[]>> {
    const onFinishHandler = buildOnFinishHandlerWithCast<unknown[]>(config.onFinish)

    return executeStep<unknown[]>({
      id: config.id,
      type: 'all',
      execute: async ({ $ }) => {
        const ac = new AbortController()
        // Link to parent signal so cancellation propagates
        const onAbort = () => ac.abort()
        ctx.signal.addEventListener('abort', onAbort, { once: true })
        try {
          return await Promise.all(config.entries.map((factory) => factory(ac.signal, $)))
        } catch (err) {
          ac.abort()
          throw err
        } finally {
          ctx.signal.removeEventListener('abort', onAbort)
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
  }

  async function race(config: RaceConfig): Promise<StepResult<unknown>> {
    const onFinishHandler = buildOnFinishHandlerRace(config.onFinish)

    return executeStep<unknown>({
      id: config.id,
      type: 'race',
      execute: async ({ $ }) => {
        const ac = new AbortController()
        // Link to parent signal so cancellation propagates
        const onAbort = () => ac.abort()
        ctx.signal.addEventListener('abort', onAbort, { once: true })
        try {
          return await Promise.race(config.entries.map((factory) => factory(ac.signal, $)))
        } finally {
          // Cancel losing entries (on success) or remaining entries (on error)
          ac.abort()
          ctx.signal.removeEventListener('abort', onAbort)
        }
      },
      onStart: config.onStart,
      onFinish: onFinishHandler,
      onError: config.onError,
    })
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
  }
}

// ---------------------------------------------------------------------------
// Helper: build hook callback without ternary or optional chaining
// ---------------------------------------------------------------------------
function buildHookCallback<F extends ((...args: never[]) => void | Promise<void>) | undefined>(
  handler: F,
  invoke: (fn: NonNullable<F>) => void | Promise<void>
): (() => void | Promise<void>) | undefined {
  if (handler != null) {
    return () => invoke(handler)
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Helper: build parent hook callback without ternary or optional chaining
// ---------------------------------------------------------------------------
function buildParentHookCallback<K extends 'onStepStart' | 'onStepFinish'>(
  hooks: StepBuilderOptions['parentHooks'],
  key: K,
  invoke: (
    fn: NonNullable<NonNullable<StepBuilderOptions['parentHooks']>[K]>
  ) => void | Promise<void>
): (() => void | Promise<void>) | undefined {
  if (hooks == null) {
    return undefined
  }
  // eslint-disable-next-line security/detect-object-injection -- Key is a controlled internal hook name, not user input
  const fn = hooks[key]
  if (fn == null) {
    return undefined
  }
  return () => invoke(fn)
}

// ---------------------------------------------------------------------------
// Helper: build onFinish handler (generic step) without ternary or !
// ---------------------------------------------------------------------------
function buildOnFinishHandler<T>(
  onFinish?: (event: { id: string; result: T; duration: number }) => void | Promise<void>
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (onFinish == null) {
    return undefined
  }
  return (event) => onFinish({ id: event.id, result: event.result as T, duration: event.duration })
}

// ---------------------------------------------------------------------------
// Helper: build onFinish handler with cast (for agent, map, reduce, while, all)
// ---------------------------------------------------------------------------
function buildOnFinishHandlerWithCast<T>(
  onFinish?: (event: { id: string; result: T; duration: number }) => void | Promise<void>
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (onFinish == null) {
    return undefined
  }
  return (event) => onFinish({ id: event.id, result: event.result as T, duration: event.duration })
}

// ---------------------------------------------------------------------------
// Helper: build onFinish handler for void-returning steps (each)
// ---------------------------------------------------------------------------
function buildOnFinishHandlerVoid(
  onFinish?: (event: { id: string; duration: number }) => void | Promise<void>
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (onFinish == null) {
    return undefined
  }
  return (event) => onFinish({ id: event.id, duration: event.duration })
}

// ---------------------------------------------------------------------------
// Helper: build onFinish handler for race (result is unknown, no cast needed)
// ---------------------------------------------------------------------------
function buildOnFinishHandlerRace(
  onFinish?: (event: { id: string; result: unknown; duration: number }) => void | Promise<void>
):
  | ((event: { id: string; result: unknown; duration: number }) => void | Promise<void>)
  | undefined {
  if (onFinish == null) {
    return undefined
  }
  return (event) => onFinish({ id: event.id, result: event.result, duration: event.duration })
}

// ---------------------------------------------------------------------------
// Helper: sequential reduce without let
// ---------------------------------------------------------------------------
async function reduceSequential<T, R>(
  items: readonly T[],
  initial: R,
  signal: AbortSignal,
  fn: (item: T, accumulator: R, index: number) => Promise<R>
): Promise<R> {
  async function loop(accumulator: R, index: number): Promise<R> {
    if (index >= items.length) {
      return accumulator
    }
    if (signal.aborted) {
      throw new Error('Aborted')
    }
    // eslint-disable-next-line security/detect-object-injection -- Array index is a locally computed number, not user input
    const next = await fn(items[index] as T, accumulator, index)
    return loop(next, index + 1)
  }
  return loop(initial, 0)
}

// ---------------------------------------------------------------------------
// Helper: sequential while without let
// ---------------------------------------------------------------------------
async function whileSequential<T>(
  condition: (state: { value: T | undefined; index: number }) => boolean,
  signal: AbortSignal,
  fn: (index: number) => Promise<T>
): Promise<T | undefined> {
  async function loop(value: T | undefined, index: number): Promise<T | undefined> {
    if (!condition({ value, index })) {
      return value
    }
    if (signal.aborted) {
      throw new Error('Aborted')
    }
    const next = await fn(index)
    return loop(next, index + 1)
  }
  return loop(undefined, 0)
}

/**
 * Worker-pool map with bounded concurrency.
 *
 * Runs `fn` over `items` with at most `concurrency` concurrent
 * executions. Results are returned in input order.
 */
async function poolMap<T, R>(
  items: readonly T[],
  concurrency: number,
  signal: AbortSignal,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = Array.from<R>({ length: items.length })
  const indexRef = { current: 0 }

  async function worker(): Promise<void> {
    while (indexRef.current < items.length) {
      if (signal.aborted) {
        throw new Error('Aborted')
      }
      const i = indexRef.current++
      // eslint-disable-next-line no-await-in-loop, security/detect-object-injection -- Sequential execution by design; array indices are locally computed numbers
      results[i] = await fn(items[i] as T, i)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}
