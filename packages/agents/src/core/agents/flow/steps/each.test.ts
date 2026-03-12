import { describe, expect, it, vi } from 'vitest'

import { createStepBuilder } from '@/core/agents/flow/steps/factory.js'
import { createMockCtx } from '@/testing/index.js'

describe('each()', () => {
  it('iterates items sequentially', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const order: number[] = []

    const result = await $.each({
      id: 'each-seq',
      input: [1, 2, 3],
      execute: async ({ item }) => {
        order.push(item)
      },
    })

    expect(result.ok).toBe(true)
    expect(order).toEqual([1, 2, 3])
    expect(result.step.type).toBe('each')
  })

  it('returns ok: true with void value on success', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.each({
      id: 'each-void',
      input: [1],
      execute: async () => {},
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBeUndefined()
  })

  it('propagates errors from execute', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.each({
      id: 'each-err',
      input: [1, 2, 3],
      execute: async ({ item }) => {
        if (item === 2) {
          throw new Error('stop at 2')
        }
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('stop at 2')
    expect(result.error.stepId).toBe('each-err')
  })

  it('stops iteration on error (does not process remaining items)', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const processed: number[] = []

    await $.each({
      id: 'each-stop',
      input: [1, 2, 3],
      execute: async ({ item }) => {
        if (item === 2) {
          throw new Error('stop')
        }
        processed.push(item)
      },
    })

    expect(processed).toEqual([1])
  })

  it('handles empty input array', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const executeSpy = vi.fn()

    const result = await $.each({
      id: 'each-empty',
      input: [],
      execute: executeSpy,
    })

    expect(result.ok).toBe(true)
    expect(executeSpy).not.toHaveBeenCalled()
  })

  it('handles single-item input', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const processed: string[] = []

    const result = await $.each({
      id: 'each-single',
      input: ['only'],
      execute: async ({ item }) => {
        processed.push(item)
      },
    })

    expect(result.ok).toBe(true)
    expect(processed).toEqual(['only'])
  })

  it('passes index to execute callback', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const indices: number[] = []

    await $.each({
      id: 'each-index',
      input: ['a', 'b', 'c'],
      execute: async ({ index }) => {
        indices.push(index)
      },
    })

    expect(indices).toEqual([0, 1, 2])
  })

  it('respects abort signal', async () => {
    const controller = new AbortController()
    const ctx = createMockCtx({ signal: controller.signal })
    const $ = createStepBuilder({ ctx })
    const processed: number[] = []

    controller.abort()

    const result = await $.each({
      id: 'each-aborted',
      input: [1, 2, 3],
      execute: async ({ item }) => {
        processed.push(item)
      },
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

    await $.each({
      id: 'each-hooks',
      input: [1, 2],
      onStart: () => {
        order.push('onStart')
      },
      execute: async ({ item }) => {
        order.push(`execute:${item}`)
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

    await $.each({
      id: 'each-onerror',
      input: [1],
      execute: async () => {
        throw new Error('each failure')
      },
      onError,
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'each-onerror',
        error: expect.any(Error),
      })
    )
  })

  it('onFinish receives duration but no result', async () => {
    const onFinish = vi.fn()
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.each({
      id: 'each-finish',
      input: [1],
      execute: async () => {},
      onFinish,
    })

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'each-finish',
        duration: expect.any(Number),
      })
    )
  })

  it('records trace entry', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    await $.each({
      id: 'each-trace',
      input: [10, 20],
      execute: async () => {},
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.id).toBe('each-trace')
    expect(traceEntry.type).toBe('each')
    expect(traceEntry.input).toEqual([10, 20])
  })

  it('provides child $ for nested operations', async () => {
    const ctx = createMockCtx()
    const $$ = createStepBuilder({ ctx })

    await $$.each({
      id: 'each-nested',
      input: [1],
      execute: async ({ $ }) => {
        await $.step({ id: 'inner-step', execute: async () => 'nested' })
      },
    })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.children).toHaveLength(1)
  })
})
