import { describe, expect, it, vi } from 'vitest'

import { createStepBuilder } from '@/core/agents/flow/steps/factory.js'
import { createMockCtx } from '@/testing/index.js'

describe('while()', () => {
  it('loops while condition is true', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.while({
      id: 'while-count',
      condition: ({ index }) => index < 3,
      execute: async ({ index }) => index,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe(2)
    expect(result.step.type).toBe('while')
  })

  it('returns undefined when condition is initially false', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.while({
      id: 'while-none',
      condition: () => false,
      execute: async () => 'should not run',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBeUndefined()
  })

  it('does not call execute when condition is initially false', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const executeSpy = vi.fn(async () => 'value')

    await $.while({
      id: 'while-no-exec',
      condition: () => false,
      execute: executeSpy,
    })

    expect(executeSpy).not.toHaveBeenCalled()
  })

  it('executes exactly once when condition is true only for first iteration', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const iterations: number[] = []

    const result = await $.while({
      id: 'while-once',
      condition: ({ index }) => index < 1,
      execute: async ({ index }) => {
        iterations.push(index)
        return `iter-${index}`
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe('iter-0')
    expect(iterations).toEqual([0])
  })

  it('passes previous value to condition', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const conditionValues: Array<number | undefined> = []

    await $.while<number>({
      id: 'while-val',
      condition: ({ value, index }) => {
        conditionValues.push(value)
        return index < 3
      },
      execute: async ({ index }) => (index + 1) * 10,
    })

    expect(conditionValues).toEqual([undefined, 10, 20, 30])
  })

  it('returns ok: false when execute throws', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.while({
      id: 'while-err',
      condition: () => true,
      execute: async ({ index }) => {
        if (index === 2) {
          throw new Error('while error')
        }
        return index
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('while error')
    expect(result.error.stepId).toBe('while-err')
  })

  it('stops iteration on error', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const iterations: number[] = []

    await $.while({
      id: 'while-stop',
      condition: () => true,
      execute: async ({ index }) => {
        iterations.push(index)
        if (index === 1) {
          throw new Error('stop')
        }
        return index
      },
    })

    expect(iterations).toEqual([0, 1])
  })

  it('respects abort signal', async () => {
    const controller = new AbortController()
    const ctx = createMockCtx({ signal: controller.signal })
    const $ = createStepBuilder({ ctx })

    controller.abort()

    const result = await $.while({
      id: 'while-aborted',
      condition: () => true,
      execute: async ({ index }) => index,
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('Aborted')
  })

  it('fires onStart and onFinish hooks', async () => {
    const order: string[] = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.while({
      id: 'while-hooks',
      condition: ({ index }) => index < 2,
      onStart: () => {
        order.push('onStart')
      },
      execute: async ({ index }) => {
        order.push(`execute:${index}`)
        return index
      },
      onFinish: () => {
        order.push('onFinish')
      },
    })

    expect(order).toEqual(['onStart', 'execute:0', 'execute:1', 'onFinish'])
  })

  it('fires onError hook on failure', async () => {
    const onError = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.while({
      id: 'while-onerror',
      condition: () => true,
      execute: async () => {
        throw new Error('while failure')
      },
      onError,
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'while-onerror',
        error: expect.any(Error),
      })
    )
  })

  it('onFinish receives last value and duration', async () => {
    const onFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.while({
      id: 'while-finish',
      condition: ({ index }) => index < 3,
      execute: async ({ index }) => index * 10,
      onFinish,
    })

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'while-finish',
        result: 20,
        duration: expect.any(Number),
      })
    )
  })

  it('onFinish receives undefined when condition is initially false', async () => {
    const onFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.while({
      id: 'while-finish-none',
      condition: () => false,
      execute: async () => 'never',
      onFinish,
    })

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'while-finish-none',
        result: undefined,
      })
    )
  })

  it('records trace entry', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.while({
      id: 'while-trace',
      condition: ({ index }) => index < 2,
      execute: async ({ index }) => index,
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.id).toBe('while-trace')
    expect(traceEntry.type).toBe('while')
    expect(traceEntry.output).toBe(1)
  })

  it('provides child $ for nested operations', async () => {
    const ctx = createMockCtx()
    const $$ = createStepBuilder({ ctx })

    await $$.while({
      id: 'while-nested',
      condition: ({ index }) => index < 1,
      execute: async ({ index, $ }) => {
        await $.step({ id: 'inner', execute: async () => index })
        return index
      },
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.children).toHaveLength(1)
  })
})
