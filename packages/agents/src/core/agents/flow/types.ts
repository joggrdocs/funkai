import type { ZodType } from 'zod'

import type { GenerateResult, Message, StreamResult } from '@/core/agents/base/types.js'
import type { Logger } from '@/core/logger.js'
import type { StepBuilder } from '@/core/agents/flow/steps/builder.js'
import type { TraceEntry, OperationType } from '@/lib/trace.js'
import type { Result } from '@/utils/result.js'

/**
 * Information about a step in a flow agent execution.
 *
 * Passed to flow agent-level hooks (`onStepStart`, `onStepFinish`)
 * and included in step events.
 */
export interface StepInfo {
  /**
   * The id from the `$` config.
   *
   * Matches the `id` field on the step config that produced this event.
   */
  id: string

  /**
   * Auto-incrementing index within the flow agent execution.
   *
   * Starts at `0` for the first `$` call and increments for each
   * subsequent tracked operation.
   */
  index: number

  /**
   * What kind of `$` call produced this step.
   *
   * Discriminant for filtering or grouping step events.
   */
  type: OperationType
}

/**
 * Result of a completed flow agent generation.
 *
 * Extends `GenerateResult` with flow-specific fields (`trace`, `duration`).
 * Consumers who only care about the `Runnable` / `Agent` contract see
 * `{ output, messages, usage, finishReason }`. Consumers who know they
 * have a `FlowAgent` can access `trace` and `duration`.
 *
 * @typeParam TOutput - The validated output type.
 */
export interface FlowAgentGenerateResult<TOutput> extends GenerateResult<TOutput> {
  /**
   * The full execution trace.
   *
   * A frozen tree of `TraceEntry` nodes representing every tracked `$`
   * operation that ran during the flow.
   */
  trace: readonly TraceEntry[]

  /**
   * Total wall-clock time in milliseconds.
   *
   * Measured from the start of the flow to the completion
   * of all operations.
   */
  duration: number
}

/**
 * Configuration for creating a flow agent.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 */
export interface FlowAgentConfig<TInput, TOutput> {
  /**
   * Unique flow agent name.
   *
   * Used in logging, trace entries, and hook events.
   */
  name: string

  /**
   * Zod schema for validating flow agent input.
   *
   * The raw input passed to `.generate()` is validated against this
   * schema before the handler is called.
   */
  input: ZodType<TInput>

  /**
   * Zod schema for validating flow agent output.
   *
   * The handler's return value is validated against this schema
   * before being returned to the caller.
   */
  output: ZodType<TOutput>

  /**
   * Pino-compatible logger.
   *
   * When omitted, the SDK creates a default console-based instance.
   * The framework automatically creates scoped child loggers
   * with contextual bindings (`flowAgentId`, `stepId`).
   */
  logger?: Logger

  /**
   * Hook: fires when the flow agent starts execution.
   *
   * @param event - Event containing the validated input.
   */
  onStart?: (event: { input: TInput }) => void | Promise<void>

  /**
   * Hook: fires when the flow agent finishes successfully.
   *
   * @param event - Event containing input, result, and duration.
   */
  onFinish?: (event: {
    input: TInput
    result: FlowAgentGenerateResult<TOutput>
    duration: number
  }) => void | Promise<void>

  /**
   * Hook: fires when the flow agent encounters an error.
   *
   * @param event - Event containing the input and error.
   */
  onError?: (event: { input: TInput; error: Error }) => void | Promise<void>

  /**
   * Hook: fires when any tracked `$` step starts.
   *
   * @param event - Event containing step info.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>

  /**
   * Hook: fires when any tracked `$` step finishes.
   *
   * @param event - Event containing step info, result, and duration.
   */
  onStepFinish?: (event: {
    step: StepInfo
    result: unknown
    duration: number
  }) => void | Promise<void>
}

/**
 * Per-call overrides for flow agent generation.
 *
 * Passed as the optional second parameter to `.generate()` or `.stream()`.
 */
export interface FlowAgentOverrides {
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
   * When provided, replaces the logger configured at creation time.
   */
  logger?: Logger

  /**
   * Per-call hook — fires after base `onStart`.
   */
  onStart?: (event: { input: unknown }) => void | Promise<void>

  /**
   * Per-call hook — fires after base `onFinish`.
   */
  onFinish?: (event: {
    input: unknown
    result: GenerateResult
    duration: number
  }) => void | Promise<void>

  /**
   * Per-call hook — fires after base `onError`.
   */
  onError?: (event: { input: unknown; error: Error }) => void | Promise<void>

  /**
   * Per-call hook — fires after base `onStepFinish`.
   */
  onStepFinish?: (event: {
    step: StepInfo
    result: unknown
    duration: number
  }) => void | Promise<void>
}

/**
 * Parameters passed to the flow agent handler function.
 *
 * @typeParam TInput - The validated input type.
 */
export interface FlowAgentParams<TInput> {
  /**
   * Validated input.
   */
  input: TInput

  /**
   * Composable step builder utilities.
   *
   * Provides tracked operations (`$.step`, `$.agent`, `$.map`, etc.)
   * that register data flow for observability and produce synthetic
   * tool-call messages.
   */
  $: StepBuilder

  /**
   * Scoped logger for the current flow execution.
   */
  log: Logger
}

/**
 * The flow agent handler function.
 *
 * This IS the flow — no step arrays, no definition objects.
 * State is just variables. `$` is passed in for tracked operations.
 *
 * @typeParam TInput - The validated input type.
 * @typeParam TOutput - The output type to return.
 */
export type FlowAgentHandler<TInput, TOutput> = (
  params: FlowAgentParams<TInput>
) => Promise<TOutput>

/**
 * A created flow agent — exposes `.generate()`, `.stream()`, and `.fn()`.
 *
 * Flow agents are imperative handlers that use `$` for tracked operations.
 * They satisfy the same `Runnable` interface as regular agents, so they
 * can be used as sub-agents, tool-wrapped delegatees, etc.
 *
 * @typeParam TInput - Validated input type.
 * @typeParam TOutput - Validated output type.
 */
export interface FlowAgent<TInput, TOutput> {
  /**
   * Run the flow agent to completion.
   *
   * Validates input, executes the handler, validates output, and
   * returns the result with messages, trace, and timing.
   *
   * @param input - Raw input (validated against the `input` Zod schema).
   * @param config - Optional per-call overrides.
   * @returns A `Result` wrapping the `FlowAgentGenerateResult`.
   */
  generate(
    input: TInput,
    config?: FlowAgentOverrides
  ): Promise<Result<FlowAgentGenerateResult<TOutput>>>

  /**
   * Run the flow agent with streaming step progress.
   *
   * Returns immediately with a stream that emits serialized tool-call
   * events for each step. `output`, `messages`, and `usage` are
   * promises that resolve after the flow completes.
   *
   * @param input - Raw input (validated against the `input` Zod schema).
   * @param config - Optional per-call overrides.
   * @returns A `Result` wrapping the `StreamResult`.
   */
  stream(
    input: TInput,
    config?: FlowAgentOverrides
  ): Promise<Result<StreamResult<TOutput>>>

  /**
   * Returns a plain function that calls `.generate()`.
   */
  fn(): (
    input: TInput,
    config?: FlowAgentOverrides
  ) => Promise<Result<FlowAgentGenerateResult<TOutput>>>
}

/**
 * @internal
 * Options that the engine uses to inject custom step augmentation
 * into flowAgent(). Not exported — only accessible within the package.
 */
export interface InternalFlowAgentOptions {
  augment$?: ($: StepBuilder, ctx: import('@/lib/context.js').Context) => StepBuilder
}
