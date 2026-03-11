import { match } from "ts-pattern";

import type { Logger } from "@/core/logger.js";

const formatHookError = (err: unknown): string =>
  match(err)
    .when(
      (e): e is Error => e instanceof Error,
      (e) => e.message,
    )
    .otherwise((e) => String(e));

/**
 * Wrap a nullable hook into a callback for `fireHooks`, avoiding
 * optional chaining, ternaries, and non-null assertions.
 *
 * @param hookFn - The hook callback, or undefined if not configured.
 * @param event - The event payload to pass to the hook.
 * @returns A thunk that calls the hook with the event, or undefined.
 *
 * @private
 */
export function wrapHook<T>(
  hookFn: ((event: T) => void | Promise<void>) | undefined,
  event: T,
): (() => void | Promise<void>) | undefined {
  if (hookFn !== undefined) {
    return () => hookFn(event);
  }
  return undefined;
}

/**
 * Run hook callbacks sequentially, logging errors at warn level.
 *
 * Unlike `attemptEachAsync`, this function surfaces errors via the
 * logger so hook failures are visible in diagnostic output.
 *
 * @param log - Logger for warning about hook errors.
 * @param handlers - Callbacks to execute in order. `undefined` entries are skipped.
 */
export async function fireHooks(
  log: Logger,
  ...handlers: Array<(() => void | Promise<void>) | undefined>
): Promise<void> {
  for (const h of handlers) {
    if (h != null) {
      try {
        // oxlint-disable-next-line no-await-in-loop - sequential by design
        await h();
      } catch (err) {
        const errorMessage = formatHookError(err);
        log.warn("hook error", {
          error: errorMessage,
        });
      }
    }
  }
}
