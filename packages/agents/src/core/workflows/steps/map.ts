import type { StepBuilder } from "@/core/workflows/steps/builder.js";

/**
 * Configuration for `$.map()` — parallel map with optional concurrency limit.
 *
 * Each item is processed as a tracked operation. All run concurrently
 * (up to `concurrency` limit). Returns results in input order.
 *
 * @typeParam T - Input item type.
 * @typeParam R - Output item type.
 */
export interface MapConfig<T, R> {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace. Individual iterations appear
   * as children of this entry.
   */
  id: string;

  /**
   * Array of items to process.
   *
   * Each item is passed to the `execute` callback along with its index.
   */
  input: readonly T[];

  /**
   * Maximum number of parallel executions.
   *
   * When set, limits how many `execute` callbacks run concurrently.
   * Results are still returned in input order regardless.
   *
   * @default Infinity
   */
  concurrency?: number;

  /**
   * Process a single item.
   *
   * @param params - Execution parameters.
   * @param params.item - The current item from the input array.
   * @param params.index - The item's zero-based index in the input array.
   * @param params.$ - The step builder for nesting further operations.
   * @returns The processed result for this item.
   */
  execute: (params: { item: T; index: number; $: StepBuilder }) => Promise<R>;

  /**
   * Hook: fires when the map operation starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>;

  /**
   * Hook: fires when all items are processed.
   *
   * @param event - Event containing the step id, results, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - Array of results in input order.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { id: string; result: R[]; duration: number }) => void | Promise<void>;

  /**
   * Hook: fires if the map operation encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
