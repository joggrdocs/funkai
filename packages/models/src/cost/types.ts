/**
 * Breakdown of cost in USD from a model invocation.
 *
 * Each field is the dollar cost for that token category.
 * All fields are non-negative numbers. Fields that don't apply are `0`.
 */
export interface CostBreakdown {
  /** Cost for input (prompt) tokens. */
  readonly prompt: number;

  /** Cost for output (completion) tokens. */
  readonly completion: number;

  /** Cost for cached input tokens (read). */
  readonly cacheRead: number;

  /** Cost for cached input tokens (write). */
  readonly cacheWrite: number;

  /** Cost for internal reasoning tokens. */
  readonly reasoning: number;

  /** Total cost (sum of all fields). */
  readonly total: number;
}
