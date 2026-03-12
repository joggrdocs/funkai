import type { StepBuilder } from '@/core/agents/flow/steps/builder.js'

/**
 * Configuration for `$.step()` — execute and register a unit of work.
 *
 * @typeParam T - The return type of the step's execute function.
 */
export interface StepConfig<T> {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace, hook events, and error messages.
   */
  id: string

  /**
   * Execute the step's logic.
   *
   * @param params - Execution parameters.
   * @param params.$ - The step builder for nesting further operations.
   * @returns The step result.
   */
  execute: (params: { $: StepBuilder }) => Promise<T>

  /**
   * Hook: fires when this step starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>

  /**
   * Hook: fires when this step finishes successfully.
   *
   * @param event - Event containing the step id, result, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - The value returned by `execute`.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { id: string; result: T; duration: number }) => void | Promise<void>

  /**
   * Hook: fires when this step encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>
}
