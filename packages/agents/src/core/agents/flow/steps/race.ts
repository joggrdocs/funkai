import type { EntryFactory } from "@/core/agents/flow/steps/all.js";

/**
 * Configuration for `$.race()` — first-to-finish wins.
 *
 * Like `Promise.race` — takes an array of factory functions. Returns
 * the first resolved value. Losers are cancelled via abort signal.
 */
export interface RaceConfig {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace.
   */
  id: string;

  /**
   * Array of factory functions to race.
   *
   * Each factory receives an `AbortSignal`. The first to resolve
   * wins; losers are cancelled by aborting the signal.
   *
   * @example
   * ```typescript
   * entries: [
   *   (signal) => $.step({ id: 'fast', execute: () => fetchFast(signal) }),
   *   (signal) => $.step({ id: 'slow', execute: () => fetchSlow(signal) }),
   * ]
   * ```
   */
  entries: EntryFactory[];

  /**
   * Hook: fires when the race starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>;

  /**
   * Hook: fires when the first entry completes.
   *
   * @param event - Event containing the step id, winner result, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - The first resolved value.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { id: string; result: unknown; duration: number }) => void | Promise<void>;

  /**
   * Hook: fires if the race encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
