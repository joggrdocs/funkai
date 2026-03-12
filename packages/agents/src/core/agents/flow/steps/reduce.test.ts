import { describe, expect, it, vi } from 'vitest'

import { createStepBuilder } from '@/core/agents/flow/steps/factory.js'
import { createMockCtx } from '@/testing/index.js'

describe('reduce()', () => {
  it('accumulates values sequentially', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.reduce({
      id: 'reduce-sum',
      input: [1, 2, 3, 4],
      initial: 0,
      execute: async ({ item, accumulator }) => accumulator + item,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe(10)
    expect(result.step.type).toBe('reduce')
  })

  it('uses initial value when input is empty', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.reduce({
      id: 'reduce-empty',
      input: [],
      initial: 42,
      execute: async ({ accumulator }) => accumulator,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe(42)
  })

  it('handles single-item input', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.reduce({
      id: 'reduce-single',
      input: [5],
      initial: 10,
      execute: async ({ item, accumulator }) => accumulator + item,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe(15)
  })

  it('processes items in order', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const order: string[] = []

    const result = await $.reduce({
      id: 'reduce-order',
      input: ['a', 'b', 'c'],
      initial: '',
      execute: async ({ item, accumulator }) => {
        order.push(item)
        return accumulator + item
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe('abc')
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('passes index to execute callback', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const indices: number[] = []

    await $.reduce({
      id: 'reduce-index',
      input: ['x', 'y', 'z'],
      initial: '',
      execute: async ({ accumulator, index }) => {
        indices.push(index)
        return accumulator
      },
    })

    expect(indices).toEqual([0, 1, 2])
  })

  it('returns ok: false when execute throws', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.reduce({
      id: 'reduce-err',
      input: [1, 2, 3],
      initial: 0,
      execute: async ({ item }) => {
        if (item === 2) {
          throw new Error('reduce error')
        }
        return item
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('reduce error')
    expect(result.error.stepId).toBe('reduce-err')
  })

  it('stops processing on error', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const processed: number[] = []

    await $.reduce({
      id: 'reduce-stop',
      input: [1, 2, 3],
      initial: 0,
      execute: async ({ item, accumulator }) => {
        if (item === 2) {
          throw new Error('stop')
        }
        processed.push(item)
        return accumulator + item
      },
    })

    expect(processed).toEqual([1])
  })

  it('respects abort signal', async () => {
    const controller = new AbortController()
    const ctx = createMockCtx({ signal: controller.signal })
    const $ = createStepBuilder({ ctx })

    controller.abort()

    const result = await $.reduce({
      id: 'reduce-aborted',
      input: [1, 2, 3],
      initial: 0,
      execute: async ({ item, accumulator }) => accumulator + item,
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('Aborted')
  })

  it('can reduce objects', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.reduce({
      id: 'reduce-obj',
      input: [
        { key: 'a', val: 1 },
        { key: 'b', val: 2 },
      ],
      initial: {} as Record<string, number>,
      execute: async ({ item, accumulator }) => ({
        ...accumulator,
        [item.key]: item.val,
      }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual({ a: 1, b: 2 })
  })

  it('fires onStart and onFinish hooks', async () => {
    const order: string[] = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.reduce({
      id: 'reduce-hooks',
      input: [1, 2],
      initial: 0,
      onStart: () => {
        order.push('onStart')
      },
      execute: async ({ item, accumulator }) => {
        order.push(`execute:${item}`)
        return accumulator + item
      },
      onFinish: () => {
        order.push('onFinish')
      },
    })

    expect(order).toEqual(['onStart', 'execute:1', 'execute:2', 'onFinish'])
  })

  it('fires onError hook on failure', async () => {
    const onError = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.reduce({
      id: 'reduce-onerror',
      input: [1],
      initial: 0,
      execute: async () => {
        throw new Error('reduce failure')
      },
      onError,
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'reduce-onerror',
        error: expect.any(Error),
      })
    )
  })

  it('onFinish receives the final accumulated result', async () => {
    const onFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.reduce({
      id: 'reduce-finish',
      input: [10, 20, 30],
      initial: 0,
      execute: async ({ item, accumulator }) => accumulator + item,
      onFinish,
    })

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'reduce-finish',
        result: 60,
        duration: expect.any(Number),
      })
    )
  })

  it('records trace entry', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.reduce({
      id: 'reduce-trace',
      input: [1, 2],
      initial: 0,
      execute: async ({ item, accumulator }) => accumulator + item,
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.id).toBe('reduce-trace')
    expect(traceEntry.type).toBe('reduce')
    expect(traceEntry.input).toEqual([1, 2])
    expect(traceEntry.output).toBe(3)
  })

  it('provides child $ for nested operations', async () => {
    const ctx = createMockCtx()
    const $$ = createStepBuilder({ ctx })

    await $$.reduce({
      id: 'reduce-nested',
      input: [1],
      initial: 0,
      execute: async ({ item, accumulator, $ }) => {
        const inner = await $.step({
          id: 'inner',
          execute: async () => item + accumulator,
        })
        if (!inner.ok) {
          throw new Error('inner failed')
        }
        return inner.value
      },
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.children).toHaveLength(1)
  })
})
