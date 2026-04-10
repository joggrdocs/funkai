import { vi } from "vitest";

import type { Logger } from "@/core/logger.js";

/**
 * Create a mock {@link Logger} backed by `vi.fn()` stubs.
 *
 * Every method is a no-op spy. `child()` returns a fresh mock
 * logger so nested scopes work without blowing up.
 */
export function createMockLogger(): Logger {
  return {
    debug: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    child: vi.fn<() => Logger>(() => createMockLogger()),
  } as unknown as Logger;
}
