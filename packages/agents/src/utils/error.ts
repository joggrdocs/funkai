import { attempt, isError, isMap, isNil, isPrimitive, isSet, isString } from "es-toolkit";

/**
 * Coerces an unknown thrown value into a proper `Error` instance.
 *
 * Handles the common cases where libraries throw non-`Error` values
 * (e.g. plain API response bodies, arrays, Maps) that would otherwise
 * serialize as `[object Object]` in error messages.
 *
 * @param thrown - The caught value from a `catch` block.
 * @returns An `Error` with a meaningful `.message`. If `thrown` is
 *   already an `Error`, it is returned as-is. The original value is
 *   preserved as `.cause` for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await riskyCall()
 * } catch (thrown) {
 *   const error = toError(thrown)
 *   console.error(error.message)
 * }
 * ```
 */
export function toError(thrown: unknown): Error {
  if (isError(thrown)) {
    return thrown;
  }
  if (isString(thrown)) {
    return new Error(thrown, { cause: thrown });
  }
  return new Error(safeStringify(thrown), { cause: thrown });
}

/**
 * Produce a human-readable string from any unknown value.
 *
 * Uses `JSON.stringify` for structured types (plain objects, arrays)
 * so the message contains actual content instead of `[object Object]`.
 * Maps and Sets are converted to their array representation first.
 * Falls back to `String()` for primitives or when serialization fails
 * (e.g. circular references).
 *
 * @param value - The value to stringify.
 * @returns A meaningful string representation.
 *
 * @example
 * ```typescript
 * safeStringify({ status: 400 })          // '{"status":400}'
 * safeStringify(new Map([['k', 'v']]))    // '[["k","v"]]'
 * safeStringify(null)                     // 'null'
 * safeStringify(42)                       // '42'
 * ```
 */
export function safeStringify(value: unknown): string {
  if (isNil(value) || isPrimitive(value)) {
    return String(value);
  }
  return safeStringifyJSON(value) || String(value);
}

/**
 * Safely serializes a value to a JSON string without throwing.
 *
 * Converts types that `JSON.stringify` handles poorly (Maps, Sets)
 * into serializable equivalents before stringifying. Returns an empty
 * string when serialization fails (e.g. circular references).
 *
 * @param value - The value to serialize.
 * @returns The JSON string, or an empty string if serialization fails.
 *
 * @example
 * ```typescript
 * safeStringifyJSON({ status: 400 })        // '{"status":400}'
 * safeStringifyJSON(new Map([['k', 'v']]))   // '[["k","v"]]'
 * safeStringifyJSON(circularObj)              // ''
 * ```
 */
export function safeStringifyJSON(value: unknown): string {
  const serializable = toSerializable(value);
  const [error, json] = attempt(() => JSON.stringify(serializable) as string | undefined);
  if (!isNil(error) || isNil(json)) {
    return "";
  }
  return json;
}

// ---------------------------------------------------------------------------
// private helpers
// ---------------------------------------------------------------------------

/**
 * Convert types that `JSON.stringify` handles poorly into
 * serializable equivalents.
 *
 * - `Map` → array of `[key, value]` entries
 * - `Set` → array of values
 * - Everything else → passed through unchanged
 *
 * @private
 * @param value - The value to normalize.
 * @returns A JSON-friendly representation.
 */
function toSerializable(value: unknown): unknown {
  if (isMap(value)) {
    return Array.from(value.entries());
  }
  if (isSet(value)) {
    return Array.from(value);
  }
  return value;
}
