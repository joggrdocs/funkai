import type { StepBuilder } from '@/core/agents/flow/steps/builder.js'

/**
 * Configuration for `$.while()` — conditional loop.
 *
 * Runs while a condition holds. Each iteration is tracked. Returns
 * the **last value** (`undefined` if the condition was false on
 * first check).
 *
 * @typeParam T - The value type produced by each iteration.
 */
export interface WhileConfig<T> {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace. Individual iterations appear
   * as children of this entry.
   */
  id: string

  /**
   * Loop condition — evaluated before each iteration.
   *
   * Called with the last iteration's value (or `undefined` before
   * the first iteration) and the current iteration index.
   *
   * @param params - Condition parameters.
   * @param params.value - The last iteration's value, or `undefined`
   *   before the first iteration.
   * @param params.index - The zero-based iteration index.
   * @returns `true` to continue looping, `false` to stop.
   */
  condition: (params: { value: T | undefined; index: number }) => boolean

  /**
   * Execute one iteration.
   *
   * @param params - Execution parameters.
   * @param params.index - The zero-based iteration index.
   * @param params.$ - The step builder for nesting further operations.
   * @returns The value for this iteration.
   */
  execute: (params: { index: number; $: StepBuilder }) => Promise<T>

  /**
   * Hook: fires when the while loop starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>

  /**
   * Hook: fires when the while loop finishes.
   *
   * @param event - Event containing the step id, last value, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - The last iteration's value, or `undefined`.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: {
    id: string
    result: T | undefined
    duration: number
  }) => void | Promise<void>

  /**
   * Hook: fires if the while loop encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>
}
