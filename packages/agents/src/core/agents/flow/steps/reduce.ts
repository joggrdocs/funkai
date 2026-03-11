import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";

/**
 * Configuration for `$.reduce()` — sequential accumulation.
 *
 * Each step depends on the previous result. Returns the final
 * accumulated value.
 *
 * @typeParam T - Input item type.
 * @typeParam R - Accumulator/result type.
 */
export interface ReduceConfig<T, R> {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace.
   */
  id: string;

  /**
   * Array of items to reduce over.
   *
   * Each item is passed to the `execute` callback along with the
   * current accumulator value.
   */
  input: readonly T[];

  /**
   * Initial accumulator value.
   *
   * Used as the `accumulator` parameter for the first `execute` call.
   */
  initial: R;

  /**
   * Reduce function — processes one item and returns the new accumulator.
   *
   * @param params - Execution parameters.
   * @param params.item - The current item from the input array.
   * @param params.accumulator - The current accumulated value.
   * @param params.index - The item's zero-based index in the input array.
   * @param params.$ - The step builder for nesting further operations.
   * @returns The updated accumulator value.
   */
  execute: (params: { item: T; accumulator: R; index: number; $: StepBuilder }) => Promise<R>;

  /**
   * Hook: fires when the reduce operation starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>;

  /**
   * Hook: fires when all items are reduced.
   *
   * @param event - Event containing the step id, final result, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - The final accumulated value.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { id: string; result: R; duration: number }) => void | Promise<void>;

  /**
   * Hook: fires if the reduce operation encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
