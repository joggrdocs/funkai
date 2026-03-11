import type { StepBuilder } from '@/core/workflows/steps/builder.js'

/**
 * Configuration for `$.each()` — sequential side effects.
 *
 * Runs items one at a time in order. Returns `void`. If you need
 * accumulated results from sequential iteration, use `$.reduce()`.
 *
 * @typeParam T - Input item type.
 */
export interface EachConfig<T> {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace.
   */
  id: string

  /**
   * Array of items to process sequentially.
   *
   * Each item is passed to the `execute` callback in order.
   */
  input: readonly T[]

  /**
   * Process a single item (side effect).
   *
   * @param params - Execution parameters.
   * @param params.item - The current item from the input array.
   * @param params.index - The item's zero-based index in the input array.
   * @param params.$ - The step builder for nesting further operations.
   */
  execute: (params: { item: T; index: number; $: StepBuilder }) => Promise<void>

  /**
   * Hook: fires when the each operation starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>

  /**
   * Hook: fires when all items are processed.
   *
   * @param event - Event containing the step id and duration.
   * @param event.id - The step's unique identifier.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { id: string; duration: number }) => void | Promise<void>

  /**
   * Hook: fires if the each operation encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>
}
