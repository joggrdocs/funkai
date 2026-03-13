/**
 * Breakdown of cost in USD from a model invocation.
 *
 * Each field is the dollar cost for that token category.
 * All fields are non-negative numbers. Fields that don't apply are `0`.
 */
export interface UsageCost {
  /** Cost for input tokens. */
  readonly input: number;

  /** Cost for output tokens. */
  readonly output: number;

  /** Cost for cached input tokens (read). */
  readonly cacheRead: number;

  /** Cost for cached input tokens (write). */
  readonly cacheWrite: number;

  /** Total cost (sum of all fields). */
  readonly total: number;
}
