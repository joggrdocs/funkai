import type { Context, ExecutionContext } from '@/lib/context.js'
import { createMockLogger } from '@/testing/logger.js'

/**
 * Create a mock {@link ExecutionContext} with a mock logger
 * and a live (non-aborted) signal.
 *
 * Pass `overrides` to replace individual fields.
 */
export function createMockExecutionCtx(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    signal: new AbortController().signal,
    log: createMockLogger(),
    ...overrides,
  }
}

/**
 * Create a mock {@link Context} with an empty trace, a mock logger,
 * and a live (non-aborted) signal.
 *
 * Pass `overrides` to replace individual fields.
 */
export function createMockCtx(overrides?: Partial<Context>): Context {
  return {
    signal: new AbortController().signal,
    log: createMockLogger(),
    trace: [],
    messages: [],
    ...overrides,
  }
}
