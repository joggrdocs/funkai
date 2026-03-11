import { describe, expect, it } from 'vitest'

import type { TraceEntry } from '@/lib/trace.js'
import { createMockCtx, createMockExecutionCtx, createMockLogger } from '@/testing/index.js'

// ---------------------------------------------------------------------------
// ExecutionContext via createMockExecutionCtx
// ---------------------------------------------------------------------------

describe('ExecutionContext', () => {
  it('provides a non-aborted signal by default', () => {
    const ctx = createMockExecutionCtx()
    expect(ctx.signal.aborted).toBe(false)
  })

  it('provides a mock logger', () => {
    const ctx = createMockExecutionCtx()
    expect(ctx.log).toBeDefined()
    expect(ctx.log.info).toBeDefined()
    expect(ctx.log.debug).toBeDefined()
    expect(ctx.log.warn).toBeDefined()
    expect(ctx.log.error).toBeDefined()
    expect(ctx.log.child).toBeDefined()
  })

  it('accepts signal override', () => {
    const controller = new AbortController()
    controller.abort()
    const ctx = createMockExecutionCtx({ signal: controller.signal })
    expect(ctx.signal.aborted).toBe(true)
  })

  it('accepts logger override', () => {
    const log = createMockLogger()
    const ctx = createMockExecutionCtx({ log })
    expect(ctx.log).toBe(log)
  })
})

// ---------------------------------------------------------------------------
// Context via createMockCtx
// ---------------------------------------------------------------------------

describe('Context', () => {
  it('provides an empty trace by default', () => {
    const ctx = createMockCtx()
    expect(ctx.trace).toEqual([])
  })

  it('provides a non-aborted signal by default', () => {
    const ctx = createMockCtx()
    expect(ctx.signal.aborted).toBe(false)
  })

  it('provides a mock logger', () => {
    const ctx = createMockCtx()
    expect(ctx.log).toBeDefined()
  })

  it('accepts trace override', () => {
    const trace = [{ id: 'step-1', type: 'step' as const, startedAt: Date.now() }]
    const ctx = createMockCtx({ trace })
    expect(ctx.trace).toBe(trace)
    expect(ctx.trace).toHaveLength(1)
  })

  it('accepts all overrides simultaneously', () => {
    const controller = new AbortController()
    const log = createMockLogger()
    const trace = [{ id: 'op-1', type: 'agent' as const, startedAt: 1000 }]

    const ctx = createMockCtx({ signal: controller.signal, log, trace })

    expect(ctx.signal).toBe(controller.signal)
    expect(ctx.log).toBe(log)
    expect(ctx.trace).toBe(trace)
  })

  it('allows pushing entries to the mutable trace array', () => {
    const ctx = createMockCtx()
    ctx.trace.push({ id: 'new-entry', type: 'step', startedAt: Date.now() })
    expect(ctx.trace).toHaveLength(1)
    const entry = ctx.trace[0] as TraceEntry
    expect(entry.id).toBe('new-entry')
  })
})
