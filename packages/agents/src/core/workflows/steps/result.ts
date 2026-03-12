import type { StepInfo } from "@/core/workflows/types.js";
import type { ResultError } from "@/utils/result.js";

/**
 * Error information for a failed step.
 *
 * Extends {@link ResultError} with the step's `id` so error handlers
 * can correlate failures back to a specific `$` call.
 */
export interface StepError extends ResultError {
  /**
   * The `id` from the step config that failed.
   */
  stepId: string;
}

/**
 * Discriminated union for step operation results.
 *
 * The success value is available via `.value`. Callers pattern-match
 * on `ok` instead of using try/catch.
 *
 * @typeParam T - The success payload type.
 */
export type StepResult<T> =
  | { ok: true; value: T; step: StepInfo; duration: number }
  | { ok: false; error: StepError; step: StepInfo; duration: number };
