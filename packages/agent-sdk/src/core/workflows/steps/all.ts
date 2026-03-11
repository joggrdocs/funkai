import type { StepBuilder } from '@/core/workflows/steps/builder.js'

/**
 * A factory that receives an abort signal and returns a promise.
 *
 * Used by `$.all()` and `$.race()` so the framework controls when
 * work starts and can cancel entries via the signal.
 *
 * The optional `$` parameter provides a child step builder whose
 * trace entries nest under the parent `all`/`race` step. Using it
 * is recommended for correct trace hierarchy.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntryFactory = (signal: AbortSignal, $: StepBuilder) => Promise<any>

/**
 * Configuration for `$.all()` — concurrent heterogeneous operations.
 *
 * Like `Promise.all` — takes an array of factory functions that the
 * framework starts concurrently. Returns results as a tuple in the
 * same order. Fails fast on the first error.
 */
export interface AllConfig {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace.
   */
  id: string

  /**
   * Array of factory functions to run concurrently.
   *
   * Each factory receives an `AbortSignal` and should return a
   * promise. The framework starts all factories at the same time
   * so timing and traces are accurate.
   *
   * @example
   * ```typescript
   * entries: [
   *   (signal) => $.step({ id: 'a', execute: () => fetchA(signal) }),
   *   (signal) => $.step({ id: 'b', execute: () => fetchB(signal) }),
   * ]
   * ```
   */
  entries: EntryFactory[]

  /**
   * Hook: fires when the all operation starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>

  /**
   * Hook: fires when all entries complete.
   *
   * @param event - Event containing the step id, results, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - Array of results in entry order.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFinish?: (event: { id: string; result: any[]; duration: number }) => void | Promise<void>

  /**
   * Hook: fires if any entry encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>
}
