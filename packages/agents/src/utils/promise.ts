/**
 * Gate a `PromiseLike` behind a completion signal.
 *
 * Returns a proper `Promise<T>` that only resolves after `gate` resolves,
 * then awaits `source`. Ensures promise fields from streaming results
 * are only accessed after the stream has been fully consumed.
 *
 * @param gate - The completion signal to wait for.
 * @param source - The `PromiseLike` to resolve after the gate.
 * @returns A `Promise` that resolves with the source value after the gate.
 *
 * @example
 * ```typescript
 * const done = processStream();
 * const text = gatePromise(done, aiResult.text);
 * ```
 */
export function gatePromise<T>(gate: Promise<unknown>, source: PromiseLike<T>): Promise<T> {
  return gate.then(() => source);
}

/**
 * Suppress unhandled rejection warnings on a `PromiseLike`.
 *
 * `PromiseLike` doesn't guarantee `.catch()`, so this attaches a no-op
 * rejection handler via `.then(undefined, noop)`.
 *
 * @param promise - The `PromiseLike` to suppress.
 *
 * @example
 * ```typescript
 * suppressRejection(streamResult.output);
 * suppressRejection(streamResult.usage);
 * ```
 */
export function suppressRejection(promise: PromiseLike<unknown>): void {
  promise.then(undefined, () => {});
}
