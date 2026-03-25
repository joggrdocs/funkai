/**
 * Breakdown of cost in USD from a model invocation.
 *
 * Each field is the dollar cost for that token category.
 * All fields are non-negative numbers. Fields that don't apply are `0`.
 *
 * **Note**: Values may exhibit floating-point imprecision inherent to
 * JavaScript `number` (IEEE 754 double-precision) arithmetic. Do not rely
 * on exact equality comparisons against expected cost values.
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

  /** Cost for reasoning tokens. */
  readonly reasoning: number;

  /** Total cost (sum of all fields). */
  readonly total: number;
}
