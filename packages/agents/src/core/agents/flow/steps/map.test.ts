import { describe, expect, it, vi } from 'vitest'

import { createStepBuilder } from '@/core/agents/flow/steps/factory.js'
import { createMockCtx } from '@/testing/index.js'

describe('map()', () => {
  it('maps items in parallel via Promise.all by default', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-all',
      input: [1, 2, 3],
      execute: async ({ item }) => item * 2,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual([2, 4, 6])
    expect(result.step.type).toBe('map')
  })

  it('respects concurrency limit', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const state = { maxConcurrent: 0, current: 0 }

    await $.map({
      id: 'map-limited',
      input: [1, 2, 3, 4, 5],
      concurrency: 2,
      execute: async ({ item }) => {
        state.current++
        state.maxConcurrent = Math.max(state.maxConcurrent, state.current)
        await new Promise((r) => setTimeout(r, 10))
        state.current--
        return item
      },
    })

    expect(state.maxConcurrent).toBeLessThanOrEqual(2)
  })

  it('returns results in input order regardless of completion order', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-order',
      input: [3, 1, 2],
      concurrency: 2,
      execute: async ({ item }) => {
        await new Promise((r) => setTimeout(r, item * 5))
        return item * 10
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual([30, 10, 20])
  })

  it('handles empty input array', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-empty',
      input: [],
      execute: async () => 'should not be called',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual([])
  })

  it('handles single-item input', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-single',
      input: ['only'],
      execute: async ({ item }) => item.toUpperCase(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toEqual(['ONLY'])
  })

  it('passes index to execute callback', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const indices: number[] = []

    await $.map({
      id: 'map-index',
      input: ['a', 'b', 'c'],
      execute: async ({ index }) => {
        indices.push(index)
        return index
      },
    })

    expect(indices).toContain(0)
    expect(indices).toContain(1)
    expect(indices).toContain(2)
  })

  it('returns ok: false when execute throws', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-err',
      input: [1, 2, 3],
      execute: async ({ item }) => {
        if (item === 2) {
          throw new Error('bad item')
        }
        return item
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('bad item')
    expect(result.error.stepId).toBe('map-err')
  })

  it('records input in trace', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.map({
      id: 'map-trace',
      input: [10, 20],
      execute: async ({ item }) => item,
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.input).toEqual([10, 20])
    expect(traceEntry.type).toBe('map')
  })

  it('fires onStart and onFinish hooks', async () => {
    const order: string[] = []
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.map({
      id: 'map-hooks',
      input: [1, 2],
      onStart: () => {
        order.push('onStart')
      },
      execute: async ({ item }) => {
        order.push(`execute:${item}`)
        return item
      },
      onFinish: () => {
        order.push('onFinish')
      },
    })

    expect(order[0]).toBe('onStart')
    expect(order[order.length - 1]).toBe('onFinish')
  })

  it('fires onError hook on failure', async () => {
    const onError = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.map({
      id: 'map-onerror',
      input: [1],
      execute: async () => {
        throw new Error('map failure')
      },
      onError,
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'map-onerror',
        error: expect.any(Error),
      })
    )
  })

  it('onFinish receives the result array', async () => {
    const onFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.map({
      id: 'map-finish-result',
      input: [1, 2, 3],
      execute: async ({ item }) => item * 2,
      onFinish,
    })

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'map-finish-result',
        result: [2, 4, 6],
        duration: expect.any(Number),
      })
    )
  })

  it('provides child $ for nested operations', async () => {
    const ctx = createMockCtx()
    const $$ = createStepBuilder({ ctx })

    await $$.map({
      id: 'map-nested',
      input: [1],
      execute: async ({ item, $ }) => {
        const inner = await $.step({
          id: 'inner',
          execute: async () => item + 10,
        })
        if (!inner.ok) {
          throw new Error('inner step failed')
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

  it('handles concurrency of 1 (sequential)', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const order: number[] = []

    await $.map({
      id: 'map-seq',
      input: [1, 2, 3],
      concurrency: 1,
      execute: async ({ item }) => {
        order.push(item)
        await new Promise((r) => setTimeout(r, 5))
        return item
      },
    })

    expect(order).toEqual([1, 2, 3])
  })
})
