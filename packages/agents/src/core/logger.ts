/**
 * Pino-compatible leveled logger with child logger support.
 *
 * Consumers inject a pino instance (or any compatible logger);
 * the SDK defines only the interface. Each method supports both
 * `(msg, meta?)` and `(meta, msg)` call signatures to match pino's API.
 *
 * Child loggers accumulate bindings from parents — the framework
 * uses `child()` at each scope boundary (workflow, step, agent)
 * so log output automatically includes execution context.
 */
export interface Logger {
  /**
   * Log a message at the DEBUG level.
   *
   * Use for verbose diagnostic output that is typically silenced
   * in production (e.g. intermediate state, resolved config).
   *
   * @param msg - Human-readable log message.
   * @param meta - Optional structured metadata merged into the log entry.
   */
  debug(msg: string, meta?: Record<string, unknown>): void;
  /**
   * Log a message at the DEBUG level (pino object-first overload).
   *
   * @param meta - Structured metadata merged into the log entry.
   * @param msg - Human-readable log message.
   */
  debug(meta: Record<string, unknown>, msg: string): void;

  /**
   * Log a message at the INFO level.
   *
   * Use for routine operational events worth recording — step
   * transitions, successful completions, and notable state changes.
   *
   * @param msg - Human-readable log message.
   * @param meta - Optional structured metadata merged into the log entry.
   */
  info(msg: string, meta?: Record<string, unknown>): void;
  /**
   * Log a message at the INFO level (pino object-first overload).
   *
   * @param meta - Structured metadata merged into the log entry.
   * @param msg - Human-readable log message.
   */
  info(meta: Record<string, unknown>, msg: string): void;

  /**
   * Log a message at the WARN level.
   *
   * Use for recoverable problems that do not halt execution but
   * may indicate degraded behavior (e.g. retries, fallback paths).
   *
   * @param msg - Human-readable log message.
   * @param meta - Optional structured metadata merged into the log entry.
   */
  warn(msg: string, meta?: Record<string, unknown>): void;
  /**
   * Log a message at the WARN level (pino object-first overload).
   *
   * @param meta - Structured metadata merged into the log entry.
   * @param msg - Human-readable log message.
   */
  warn(meta: Record<string, unknown>, msg: string): void;

  /**
   * Log a message at the ERROR level.
   *
   * Use for failures that prevent an operation from completing
   * successfully — unhandled exceptions, rejected promises, or
   * invariant violations.
   *
   * @param msg - Human-readable log message.
   * @param meta - Optional structured metadata merged into the log entry.
   */
  error(msg: string, meta?: Record<string, unknown>): void;
  /**
   * Log a message at the ERROR level (pino object-first overload).
   *
   * @param meta - Structured metadata merged into the log entry.
   * @param msg - Human-readable log message.
   */
  error(meta: Record<string, unknown>, msg: string): void;

  /**
   * Create a child logger that inherits all parent bindings.
   *
   * The returned logger automatically includes the merged bindings
   * in every log entry. The framework calls `child()` at each scope
   * boundary (workflow, step, agent) so downstream logs carry full
   * execution context without manual threading.
   *
   * @param bindings - Key-value pairs merged into every log entry
   *   produced by the child (and its descendants).
   * @returns A new {@link Logger} with the accumulated bindings.
   */
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Create a minimal console-based logger satisfying the {@link Logger} interface.
 *
 * Supports `child()` by merging bindings into a prefix object.
 * Each log call prepends the accumulated bindings to the output.
 *
 * Used as the default when no pino-compatible logger is injected.
 */
export function createDefaultLogger(bindings?: Record<string, unknown>): Logger {
  const prefix = bindings ?? {};
  return {
    debug(first: string | Record<string, unknown>, second?: string | Record<string, unknown>) {
      writeLog(prefix, "debug", first, second);
    },
    info(first: string | Record<string, unknown>, second?: string | Record<string, unknown>) {
      writeLog(prefix, "info", first, second);
    },
    warn(first: string | Record<string, unknown>, second?: string | Record<string, unknown>) {
      writeLog(prefix, "warn", first, second);
    },
    error(first: string | Record<string, unknown>, second?: string | Record<string, unknown>) {
      writeLog(prefix, "error", first, second);
    },
    child(childBindings: Record<string, unknown>): Logger {
      return createDefaultLogger({ ...prefix, ...childBindings });
    },
  };
}

/**
 *
 * @param bindings
 * @param level
 * @param first
 * @param second
 * @private
 */
function writeLog(
  bindings: Record<string, unknown>,
  level: "debug" | "info" | "warn" | "error",
  first: string | Record<string, unknown>,
  second?: string | Record<string, unknown>,
): void {
  if (typeof first === "string") {
    const meta = second as Record<string, unknown> | undefined;
    // eslint-disable-next-line security/detect-object-injection -- Log level is a controlled string from the logger, not user input
    console[level]({ ...bindings, ...meta }, first);
  } else {
    // eslint-disable-next-line security/detect-object-injection -- Log level is a controlled string from the logger, not user input
    console[level]({ ...bindings, ...first }, second as string);
  }
}
