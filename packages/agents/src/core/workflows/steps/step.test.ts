import { describe, expect, it, vi } from 'vitest'

import { createStepBuilder } from '@/core/workflows/steps/factory.js'
import { createMockCtx } from '@/testing/index.js'

describe('step()', () => {
  it('returns ok: true with value on success', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'greet',
      execute: async () => ({ greeting: 'hello' }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual({ greeting: 'hello' })
    expect(result.step.id).toBe('greet')
    expect(result.step.type).toBe('step')
    expect(result.step.index).toBe(0)
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('returns ok: false with StepError on thrown error', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'fail',
      execute: async () => {
        throw new Error('boom')
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.code).toBe('STEP_ERROR')
    expect(result.error.message).toBe('boom')
    expect(result.error.stepId).toBe('fail')
    expect(result.error.cause).toBeInstanceOf(Error)
    expect(result.step.id).toBe('fail')
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('wraps non-Error thrown values into Error', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'string-throw',
      execute: async () => {
        // eslint-disable-next-line no-throw-literal
        throw 'raw string error'
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('raw string error')
    expect(result.error.cause).toBeInstanceOf(Error)
  })

  it('serializes thrown plain objects as JSON instead of [object Object]', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'object-throw',
      execute: async () => {
        // eslint-disable-next-line no-throw-literal
        throw { status: 400, message: 'sandbox name too long' }
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('{"status":400,"message":"sandbox name too long"}')
    expect(result.error.cause).toBeInstanceOf(Error)
  })

  it('fires hooks in order: onStart -> execute -> onFinish', async () => {
    const order: string[] = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.step({
      id: 'ordered',
      onStart: () => {
        order.push('onStart')
      },
      execute: async () => {
        order.push('execute')
        return { v: 1 }
      },
      onFinish: () => {
        order.push('onFinish')
      },
    })

    expect(order).toEqual(['onStart', 'execute', 'onFinish'])
  })

  it('fires onError instead of onFinish on failure', async () => {
    const order: string[] = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.step({
      id: 'err-hooks',
      onStart: () => {
        order.push('onStart')
      },
      execute: async () => {
        order.push('execute')
        throw new Error('fail')
      },
      onFinish: () => {
        order.push('onFinish')
      },
      onError: () => {
        order.push('onError')
      },
    })

    expect(order).toEqual(['onStart', 'execute', 'onError'])
  })

  it('fires parent hooks after step hooks', async () => {
    const order: string[] = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({
      ctx,
      parentHooks: {
        onStepStart: () => {
          order.push('parentStart')
        },
        onStepFinish: () => {
          order.push('parentFinish')
        },
      },
    })

    await $.step({
      id: 'parent-hooks',
      onStart: () => {
        order.push('onStart')
      },
      execute: async () => {
        order.push('execute')
        return { v: 1 }
      },
      onFinish: () => {
        order.push('onFinish')
      },
    })

    expect(order).toEqual(['onStart', 'parentStart', 'execute', 'onFinish', 'parentFinish'])
  })

  it('parentHooks.onStepFinish fires on error with result undefined', async () => {
    const parentFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({
      ctx,
      parentHooks: { onStepFinish: parentFinish },
    })

    await $.step({
      id: 'parent-finish-on-error',
      execute: async () => {
        throw new Error('fail')
      },
    })

    expect(parentFinish).toHaveBeenCalledTimes(1)
    expect(parentFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        step: expect.objectContaining({ id: 'parent-finish-on-error' }),
        result: undefined,
      })
    )
  })

  it('swallows hook errors without breaking execution', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'safe',
      onStart: () => {
        throw new Error('hook boom')
      },
      execute: async () => ({ value: 42 }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual({ value: 42 })
    expect(ctx.log.warn).toHaveBeenCalledWith('hook error', { error: 'hook boom' })
  })

  it('registers trace entries on success', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.step({
      id: 'traced',
      execute: async () => ({ v: 1 }),
    })

    expect(ctx.trace).toHaveLength(1)
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.id).toBe('traced')
    expect(traceEntry.type).toBe('step')
    expect(traceEntry.output).toEqual({ v: 1 })
    expect(traceEntry.finishedAt).toBeGreaterThan(0)
  })

  it('records trace error on failure', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.step({
      id: 'trace-err',
      execute: async () => {
        throw new Error('trace-boom')
      },
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.error).toBeInstanceOf(Error)
    if (traceEntry.error === undefined) {
      throw new Error('Expected trace error')
    }
    expect(traceEntry.error.message).toBe('trace-boom')
  })

  it('increments step index across calls', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const r1 = await $.step({ id: 'a', execute: async () => ({}) })
    const r2 = await $.step({ id: 'b', execute: async () => ({}) })
    const r3 = await $.step({ id: 'c', execute: async () => ({}) })

    expect(r1.step.index).toBe(0)
    expect(r2.step.index).toBe(1)
    expect(r3.step.index).toBe(2)
  })

  it('emits step:start and step:finish events', async () => {
    const events: Array<{ type: string }> = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx, emit: (e) => events.push(e) })

    await $.step({ id: 'emit', execute: async () => ({}) })

    expect(events).toHaveLength(2)
    const startEvent = events[0]
    if (startEvent === undefined) {
      throw new Error('Expected start event')
    }
    const finishEvent = events[1]
    if (finishEvent === undefined) {
      throw new Error('Expected finish event')
    }
    expect(startEvent.type).toBe('step:start')
    expect(finishEvent.type).toBe('step:finish')
  })

  it('emits step:error on failure', async () => {
    const events: Array<{ type: string }> = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx, emit: (e) => events.push(e) })

    await $.step({
      id: 'emit-err',
      execute: async () => {
        throw new Error('x')
      },
    })

    expect(events).toHaveLength(2)
    const startEvent = events[0]
    if (startEvent === undefined) {
      throw new Error('Expected start event')
    }
    const errorEvent = events[1]
    if (errorEvent === undefined) {
      throw new Error('Expected error event')
    }
    expect(startEvent.type).toBe('step:start')
    expect(errorEvent.type).toBe('step:error')
  })

  it('provides child $ for nested operations', async () => {
    const ctx = createMockCtx()
    const $$ = createStepBuilder({ ctx })

    await $$.step({
      id: 'parent',
      execute: async ({ $ }) => {
        await $.step({ id: 'child', execute: async () => ({}) })
        return {}
      },
    })

    expect(ctx.trace).toHaveLength(1)
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.children).toHaveLength(1)
    if (traceEntry.children === undefined) {
      throw new Error('Expected trace children')
    }
    const childEntry = traceEntry.children[0]
    if (childEntry === undefined) {
      throw new Error('Expected child trace entry')
    }
    expect(childEntry.id).toBe('child')
  })

  it('handles primitive string return', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'str',
      execute: async () => 'hello',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe('hello')
  })

  it('handles primitive number return', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'num',
      execute: async () => 42,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe(42)
  })

  it('onFinish receives the result and duration', async () => {
    const onFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.step({
      id: 'finish-params',
      execute: async () => ({ data: 'test' }),
      onFinish,
    })

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'finish-params',
        result: { data: 'test' },
        duration: expect.any(Number),
      })
    )
  })

  it('onError receives the error and step id', async () => {
    const onError = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.step({
      id: 'error-params',
      execute: async () => {
        throw new Error('test error')
      },
      onError,
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'error-params',
        error: expect.any(Error),
      })
    )
  })

  it('handles null return value', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'null-return',
      execute: async () => null,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBeNull()
  })

  it('handles undefined return value', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.step({
      id: 'void-return',
      execute: async () => undefined,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBeUndefined()
  })
})
