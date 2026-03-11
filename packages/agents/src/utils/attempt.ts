import { attempt, attemptAsync } from "es-toolkit";

/**
 * Run N callbacks sequentially, swallowing errors.
 *
 * Returns an array of `[error, result]` tuples following the
 * same convention as `attempt` from es-toolkit.
 *
 * @param handlers - Callbacks to execute in order. `undefined` entries are skipped.
 * @returns An array of attempt results for each non-undefined handler.
 */
export function attemptEach<T = void, E = Error>(
  ...handlers: Array<(() => T) | undefined>
): Array<[null, T] | [E, null]> {
  return handlers.filter((h): h is () => T => h != null).map((h) => attempt<T, E>(h));
}

/**
 * Run N async callbacks sequentially, swallowing errors.
 *
 * Returns an array of `[error, result]` tuples following the
 * same convention as `attemptAsync` from es-toolkit.
 *
 * @param handlers - Callbacks to execute in order. `undefined` entries are skipped.
 * @returns An array of attempt results for each non-undefined handler.
 */
export async function attemptEachAsync<T = void, E = Error>(
  ...handlers: Array<(() => T | Promise<T>) | undefined>
): Promise<Array<[null, T] | [E, null]>> {
  const results: Array<[null, T] | [E, null]> = [];
  for (const h of handlers) {
    if (h != null) {
      // oxlint-disable-next-line no-await-in-loop - sequential by design
      results.push(await attemptAsync<T, E>(async () => h()));
    }
  }
  return results;
}
