import type { ZodType } from 'zod'

import type { Logger } from '@/core/logger.js'
import { createDefaultLogger } from '@/core/logger.js'
import type { TokenUsage } from '@/core/provider/types.js'
import { sumTokenUsage } from '@/core/provider/usage.js'
import type { StepBuilder } from '@/core/workflows/steps/builder.js'
import { createStepBuilder } from '@/core/workflows/steps/factory.js'
import type { StepInfo, StepEvent } from '@/core/workflows/types.js'
import type { Context } from '@/lib/context.js'
import { fireHooks } from '@/lib/hooks.js'
import { RUNNABLE_META, type RunnableMeta } from '@/lib/runnable.js'
import type { TraceEntry } from '@/lib/trace.js'
import { collectUsages, snapshotTrace } from '@/lib/trace.js'
import { toError } from '@/utils/error.js'
import type { Result } from '@/utils/result.js'

/**
 * Result of a completed workflow generation.
 *
 * Contains the validated output, the full execution trace, and
 * timing information.
 *
 * @typeParam TOutput - The validated output type.
 */
export interface WorkflowResult<TOutput> {
  /**
   * The validated output.
   *
   * Validated against the workflow's `output` Zod schema before
   * being returned to the caller.
   */
  output: TOutput

  /**
   * The full execution trace.
   *
   * A frozen tree of `TraceEntry` nodes representing every tracked `$`
   * operation that ran during the workflow.
   */
  trace: readonly TraceEntry[]

  /**
   * Aggregated token usage across all agent steps.
   *
   * Sums the `usage` from every `$.agent()` call in the workflow,
   * including nested operations. All fields are resolved numbers
   * (0 when no agent steps ran).
   */
  usage: TokenUsage

  /**
   * Total wall-clock time in milliseconds.
   *
   * Measured from the start of the workflow to the completion
   * of all operations.
   */
  duration: number
}

/**
 * Result of a streaming workflow generation.
 *
 * The `stream` emits step progress events as the workflow executes.
 * After completion, `output`, `trace`, and `duration` are available.
 *
 * @typeParam TOutput - The validated output type.
 */
export interface WorkflowStreamResult<TOutput> {
  /**
   * The final output (available after stream completes).
   *
   * Validated against the workflow's `output` Zod schema.
   */
  output: TOutput

  /**
   * The full execution trace.
   *
   * Available after the stream completes. Frozen to prevent mutation.
   */
  trace: readonly TraceEntry[]

  /**
   * Aggregated token usage across all agent steps.
   *
   * Available after the stream completes. Sums the `usage` from
   * every `$.agent()` call in the workflow.
   */
  usage: TokenUsage

  /**
   * Total wall-clock time in milliseconds.
   *
   * Available after the stream completes.
   */
  duration: number

  /**
   * Stream of step progress events.
   *
   * Subscribe to see steps start, finish, and error in real-time.
   * Text streaming from agents is handled at the agent level
   * (`agent.stream()`), not the workflow level.
   */
  stream: ReadableStream<StepEvent>
}

/**
 * Per-call overrides for workflow generation.
 *
 * Passed as the optional second parameter to `.generate()` or `.stream()`.
 */
export interface WorkflowOverrides {
  /**
   * Abort signal for cancellation.
   *
   * When fired, all in-flight operations should clean up and exit.
   * Propagated through the entire execution tree.
   */
  signal?: AbortSignal

  /**
   * Override the logger for this call.
   *
   * When provided, replaces the logger configured at workflow creation
   * time. The framework creates a child logger with contextual bindings
   * (`workflowId`) that flows through all steps and agents.
   */
  logger?: Logger
}

/**
 * Parameters passed to the workflow handler function.
 *
 * @typeParam TInput - The validated input type.
 */
export interface WorkflowParams<TInput> {
  /**
   * Validated input.
   *
   * The raw input passed to `.generate()` after validation against
   * the workflow's `input` Zod schema.
   */
  input: TInput

  /**
   * Composable step builder utilities.
   *
   * Provides tracked operations (`$.step`, `$.agent`, `$.map`, etc.)
   * that register data flow for observability.
   */
  $: StepBuilder

  /**
   * Scoped logger for the current workflow execution.
   *
   * Pre-configured with `workflowId` bindings. Use for ad-hoc
   * logging inside the workflow handler — step and agent scopes
   * receive their own child loggers automatically.
   */
  log: Logger
}

/**
 * The workflow handler function.
 *
 * This IS the workflow — no step arrays, no definition objects.
 * State is just variables. `$` is passed in for tracked operations.
 *
 * @typeParam TInput - The validated input type.
 * @typeParam TOutput - The output type to return.
 * @param params - Workflow parameters with validated input and `$`.
 * @returns The workflow output, validated against the `output` schema.
 */
export type WorkflowHandler<TInput, TOutput> = (params: WorkflowParams<TInput>) => Promise<TOutput>

/**
 * Configuration for creating a workflow.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 */
export interface WorkflowConfig<TInput, TOutput> {
  /**
   * Unique workflow name.
   *
   * Used in logging, trace entries, and hook events.
   */
  name: string

  /**
   * Zod schema for validating workflow input.
   *
   * The raw input passed to `.generate()` is validated against this
   * schema before the handler is called.
   */
  input: ZodType<TInput>

  /**
   * Zod schema for validating workflow output.
   *
   * The handler's return value is validated against this schema
   * before being returned to the caller.
   */
  output: ZodType<TOutput>

  /**
   * Pino-compatible logger.
   *
   * When omitted, the SDK creates a default pino instance at `info`
   * level. The framework automatically creates scoped child loggers
   * with contextual bindings (`workflowId`, `stepId`).
   */
  logger?: Logger

  /**
   * Hook: fires when the workflow starts execution.
   *
   * @param event - Event containing the validated input.
   * @param event.input - The validated input value.
   */
  onStart?: (event: { input: TInput }) => void | Promise<void>

  /**
   * Hook: fires when the workflow finishes successfully.
   *
   * @param event - Event containing input, output, and duration.
   * @param event.input - The validated input value.
   * @param event.output - The validated output value.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { input: TInput; output: TOutput; duration: number }) => void | Promise<void>

  /**
   * Hook: fires when the workflow encounters an error.
   *
   * @param event - Event containing the input and error.
   * @param event.input - The validated input value.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { input: TInput; error: Error }) => void | Promise<void>

  /**
   * Hook: fires when any tracked `$` step starts.
   *
   * @param event - Event containing step info.
   * @param event.step - Information about the step that started.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>

  /**
   * Hook: fires when any tracked `$` step finishes.
   *
   * @param event - Event containing step info, result, and duration.
   * @param event.step - Information about the step that finished.
   * @param event.result - The value produced by the step.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onStepFinish?: (event: {
    step: StepInfo
    result: unknown
    duration: number
  }) => void | Promise<void>
}

/**
 * A created workflow — exposes `.generate()`, `.stream()`, and `.fn()`.
 *
 * Workflows are imperative handlers that use `$` for tracked operations.
 * State is just variables. The framework validates input/output via Zod,
 * records the execution trace, and wraps everything in `Result`.
 *
 * @typeParam TInput - Validated input type.
 * @typeParam TOutput - Validated output type.
 */
export interface Workflow<TInput, TOutput> {
  /**
   * Run the workflow to completion.
   *
   * Validates input, executes the handler, validates output, and
   * returns the result with execution trace and timing.
   *
   * @param input - Raw input (validated against the `input` Zod schema).
   * @param config - Optional per-call overrides.
   * @returns A `Result` wrapping the `WorkflowResult`. On success,
   *   `result.ok` is `true` and result fields are flat on the object.
   */
  generate(input: TInput, config?: WorkflowOverrides): Promise<Result<WorkflowResult<TOutput>>>

  /**
   * Run the workflow with streaming step progress.
   *
   * Like `.generate()` but also provides a readable stream of
   * `StepEvent` objects for real-time observability.
   *
   * @param input - Raw input (validated against the `input` Zod schema).
   * @param config - Optional per-call overrides.
   * @returns A `Result` wrapping the `WorkflowStreamResult`. On success,
   *   consume `result.stream` for step progress events.
   */
  stream(input: TInput, config?: WorkflowOverrides): Promise<Result<WorkflowStreamResult<TOutput>>>

  /**
   * Returns a plain function that calls `.generate()`.
   *
   * Use for clean single-function exports where you want to hide
   * the workflow object and just expose a callable.
   *
   * @returns A function with the same signature as `.generate()`.
   *
   * @example
   * ```typescript
   * export const runDocCoverage = docCoverageWorkflow.fn()
   * // Usage: const result = await runDocCoverage({ repoUrl: '...' })
   * ```
   */
  fn(): (input: TInput, config?: WorkflowOverrides) => Promise<Result<WorkflowResult<TOutput>>>
}

// ---------------------------------------------------------------------------
// Internal options (used by workflowEngine)
// ---------------------------------------------------------------------------

/**
 * @internal
 * Options that the engine uses to inject custom step augmentation
 * into workflow(). Not exported — only accessible within the package.
 */
export interface InternalWorkflowOptions {
  augment$?: ($: StepBuilder, ctx: Context) => StepBuilder
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function augmentStepBuilder(
  base: StepBuilder,
  ctx: Context,
  internal: InternalWorkflowOptions | undefined
): StepBuilder {
  if (internal && internal.augment$) {
    return internal.augment$(base, ctx)
  }
  return base
}

// ---------------------------------------------------------------------------
// workflow
// ---------------------------------------------------------------------------

/**
 * Create a workflow with typed input/output, tracked steps, and hooks.
 *
 * The handler IS the workflow — no step arrays, no definition objects.
 * State is just variables. `$` is passed into every callback so you
 * can nest operations freely.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 * @param config - Workflow configuration including name, schemas,
 *   hooks, and logger.
 * @param handler - The workflow handler function that receives
 *   validated input and the `$` step builder.
 * @param _internal - Internal options used by the engine. Not public API.
 * @returns A `Workflow` instance with `.generate()`, `.stream()`,
 *   and `.fn()`.
 *
 * @example
 * ```typescript
 * const wf = workflow({
 *   name: 'my-workflow',
 *   input: MySchemaIn,
 *   output: MySchemaOut,
 * }, async ({ input, $ }) => {
 *   const data = await $.step({
 *     id: 'fetch-data',
 *     execute: async () => fetchData(input.id),
 *   })
 *
 *   const result = await $.agent({
 *     id: 'analyze',
 *     agent: myAgent,
 *     input: { data },
 *   })
 *
 *   return { data, analysis: result.ok ? result.output : null }
 * })
 *
 * export const runMyWorkflow = wf.fn()
 * ```
 */
export function workflow<TInput, TOutput>(
  config: WorkflowConfig<TInput, TOutput>,
  handler: WorkflowHandler<TInput, TOutput>,
  _internal?: InternalWorkflowOptions
): Workflow<TInput, TOutput> {
  const baseLogger = config.logger ?? createDefaultLogger()

  async function generate(
    input: TInput,
    overrides?: WorkflowOverrides
  ): Promise<Result<WorkflowResult<TOutput>>> {
    const inputParsed = config.input.safeParse(input)
    if (!inputParsed.success) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Input validation failed: ${inputParsed.error.message}`,
        },
      }
    }

    const startedAt = Date.now()
    const log = resolveWorkflowLogger(baseLogger, config.name, overrides)

    const signal = (overrides && overrides.signal) || new AbortController().signal
    const trace: TraceEntry[] = []
    const ctx: Context = { signal, log, trace }

    const base$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: config.onStepStart,
        onStepFinish: config.onStepFinish,
      },
    })

    const $ = augmentStepBuilder(base$, ctx, _internal)

    if (config.onStart) {
      const onStart = config.onStart
      await fireHooks(log, () => onStart({ input }))
    }

    log.debug('workflow.generate start', { name: config.name })

    try {
      const output = await handler({ input, $, log })

      const outputParsed = config.output.safeParse(output)
      if (!outputParsed.success) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Output validation failed: ${outputParsed.error.message}`,
          },
        }
      }

      const duration = Date.now() - startedAt

      if (config.onFinish) {
        const onFinish = config.onFinish
        await fireHooks(log, () => onFinish({ input, output, duration }))
      }

      log.debug('workflow.generate finish', { name: config.name, duration })

      const usage = sumTokenUsage(collectUsages(trace))

      return { ok: true, output, trace: snapshotTrace(trace), usage, duration }
    } catch (thrown) {
      const error = toError(thrown)
      const duration = Date.now() - startedAt

      log.error('workflow.generate error', { name: config.name, error: error.message, duration })

      if (config.onError) {
        const onError = config.onError
        await fireHooks(log, () => onError({ input, error }))
      }

      return {
        ok: false,
        error: {
          code: 'WORKFLOW_ERROR',
          message: error.message,
          cause: error,
        },
      }
    }
  }

  async function stream(
    input: TInput,
    overrides?: WorkflowOverrides
  ): Promise<Result<WorkflowStreamResult<TOutput>>> {
    const inputParsed = config.input.safeParse(input)
    if (!inputParsed.success) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Input validation failed: ${inputParsed.error.message}`,
        },
      }
    }

    const startedAt = Date.now()
    const log = resolveWorkflowLogger(baseLogger, config.name, overrides)

    const signal = (overrides && overrides.signal) || new AbortController().signal
    const trace: TraceEntry[] = []
    const ctx: Context = { signal, log, trace }

    const { readable, writable } = new TransformStream<StepEvent>()
    const writer = writable.getWriter()

    const streamBase$ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: config.onStepStart,
        onStepFinish: config.onStepFinish,
      },
      emit: (event) => {
        writer.write(event).catch(() => {})
      },
    })

    const $ = augmentStepBuilder(streamBase$, ctx, _internal)

    if (config.onStart) {
      const onStart = config.onStart
      await fireHooks(log, () => onStart({ input }))
    }

    log.debug('workflow.stream start', { name: config.name })

    try {
      const output = await handler({ input, $, log })

      const outputParsed = config.output.safeParse(output)
      if (!outputParsed.success) {
        await writer.close()
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Output validation failed: ${outputParsed.error.message}`,
          },
        }
      }

      const duration = Date.now() - startedAt

      await writer.write({ type: 'workflow:finish', output, duration })
      await writer.close()

      if (config.onFinish) {
        const onFinish = config.onFinish
        await fireHooks(log, () => onFinish({ input, output, duration }))
      }

      log.debug('workflow.stream finish', { name: config.name, duration })

      const usage = sumTokenUsage(collectUsages(trace))

      return { ok: true, output, trace: snapshotTrace(trace), usage, duration, stream: readable }
    } catch (thrown) {
      const error = toError(thrown)
      const duration = Date.now() - startedAt

      log.error('workflow.stream error', { name: config.name, error: error.message, duration })

      await writer.close()

      if (config.onError) {
        const onError = config.onError
        await fireHooks(log, () => onError({ input, error }))
      }

      return {
        ok: false,
        error: {
          code: 'WORKFLOW_ERROR',
          message: error.message,
          cause: error,
        },
      }
    }
  }

  // eslint-disable-next-line no-shadow -- Local variable is the return value constructed inside its own factory function
  const workflow: Workflow<TInput, TOutput> = {
    generate,
    stream,
    fn: () => generate,
  }

  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
  ;(workflow as unknown as Record<symbol, unknown>)[RUNNABLE_META] = {
    name: config.name,
    inputSchema: config.input,
  } satisfies RunnableMeta

  return workflow
}

// ---------------------------------------------------------------------------
// helpers (private)
// ---------------------------------------------------------------------------

/**
 * Resolve the logger for a single workflow execution.
 *
 * Uses the per-call override when provided, otherwise falls back to
 * the base logger from the workflow config. A child logger with
 * `workflowId` bindings is always created so downstream steps and
 * agents carry execution context.
 *
 * @param base - The default logger from the workflow config.
 * @param workflowId - The workflow name used as a binding.
 * @param overrides - Optional per-call overrides.
 * @returns A scoped child {@link Logger} for the execution.
 * @private
 */
function resolveWorkflowLogger(
  base: Logger,
  workflowId: string,
  overrides?: WorkflowOverrides
): Logger {
  const override = overrides && overrides.logger
  return (override ?? base).child({ workflowId })
}
