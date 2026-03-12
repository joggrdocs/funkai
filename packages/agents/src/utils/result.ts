/**
 * Error information returned when an SDK operation fails.
 *
 * Every public method returns `Result<T>` instead of throwing.
 * When `ok` is `false`, the error details are available on this interface.
 */
export interface ResultError {
  /**
   * Machine-readable error code.
   *
   * Identifies the category of failure. Stable across versions —
   * safe to match against in application code.
   *
   * @example
   * ```typescript
   * switch (result.error.code) {
   *   case 'VALIDATION_ERROR': // input schema failed
   *   case 'ABORT_ERROR':      // signal was aborted
   *   case 'AGENT_ERROR':      // agent execution failed
   * }
   * ```
   */
  code: string

  /**
   * Human-readable error description.
   *
   * Suitable for logging but not for programmatic matching —
   * use `code` for that.
   */
  message: string

  /**
   * Original thrown error, if any.
   *
   * Preserved so callers can inspect the root cause when the
   * SDK catches and wraps an exception.
   */
  cause?: Error
}

/**
 * Discriminated union for SDK operation results.
 *
 * Success fields are **flat on the object** — no `.value` wrapper.
 * Callers pattern-match on `ok` instead of using try/catch.
 *
 * @typeParam T - The success payload shape. All fields from `T` are
 *   spread directly onto the success branch alongside `ok: true`.
 *
 * @example
 * ```typescript
 * const result = await agent.generate({ topic: 'TypeScript' })
 *
 * if (!result.ok) {
 *   // Error branch — only `ok` and `error` are present.
 *   console.error(result.error.code, result.error.message)
 *   return
 * }
 *
 * // Success branch — all fields from T are directly on result.
 * console.log(result.output)
 * console.log(result.duration)
 * console.log(result.trace)
 * ```
 */
export type Result<T> = (T & { ok: true }) | { ok: false; error: ResultError }

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Create a success `Result`.
 *
 * Spreads the payload flat onto the object alongside `ok: true`.
 *
 * @param value - The success payload.
 * @returns A success `Result<T>`.
 *
 * @example
 * ```typescript
 * return ok({ output: 'hello', messages: [] })
 * // → { ok: true, output: 'hello', messages: [] }
 * ```
 */
export function ok<T extends Record<string, unknown>>(value: T): T & { ok: true } {
  return { ...value, ok: true as const }
}

/**
 * Create a failure `Result`.
 *
 * @param code - Machine-readable error code.
 * @param message - Human-readable error description.
 * @param cause - Optional original thrown error.
 * @returns A failure `Result` for any `T`.
 *
 * @example
 * ```typescript
 * return err('VALIDATION_ERROR', 'Name is required')
 * return err('AGENT_ERROR', error.message, error)
 * ```
 */
export function err(
  code: string,
  message: string,
  cause?: Error
): { ok: false; error: ResultError } {
  return { ok: false as const, error: { code, message, cause } }
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Narrow a `Result<T>` to its success branch.
 *
 * @param result - The result to check.
 * @returns `true` when `result.ok` is `true`.
 *
 * @example
 * ```typescript
 * const result = await agent.generate('hello')
 * if (isOk(result)) {
 *   console.log(result.output)
 * }
 * ```
 */
export function isOk<T>(result: Result<T>): result is T & { ok: true } {
  return result.ok
}

/**
 * Narrow a `Result<T>` to its failure branch.
 *
 * @param result - The result to check.
 * @returns `true` when `result.ok` is `false`.
 *
 * @example
 * ```typescript
 * const result = await agent.generate('hello')
 * if (isErr(result)) {
 *   console.error(result.error.code, result.error.message)
 * }
 * ```
 */
export function isErr<T>(result: Result<T>): result is { ok: false; error: ResultError } {
  return !result.ok
}
