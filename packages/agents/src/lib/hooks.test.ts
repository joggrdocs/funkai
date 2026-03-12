import { describe, it, expect, vi } from 'vitest'

import { fireHooks } from '@/lib/hooks.js'
import { createMockLogger } from '@/testing/logger.js'

describe('fireHooks', () => {
  it('runs handlers sequentially', async () => {
    const log = createMockLogger()
    const order: number[] = []

    await fireHooks(
      log,
      () => {
        order.push(1)
      },
      () => {
        order.push(2)
      },
      () => {
        order.push(3)
      }
    )

    expect(order).toEqual([1, 2, 3])
  })

  it('skips undefined handlers', async () => {
    const log = createMockLogger()
    const called = vi.fn()

    await fireHooks(log, undefined, called, undefined)

    expect(called).toHaveBeenCalledOnce()
  })

  it('swallows errors and logs them at warn level', async () => {
    const log = createMockLogger()
    const after = vi.fn()

    await fireHooks(
      log,
      () => {
        throw new Error('boom')
      },
      after
    )

    expect(log.warn).toHaveBeenCalledWith('hook error', { error: 'boom' })
    expect(after).toHaveBeenCalledOnce()
  })

  it('logs non-Error thrown values as strings', async () => {
    const log = createMockLogger()

    await fireHooks(log, () => {
      throw 'string error'
    })

    expect(log.warn).toHaveBeenCalledWith('hook error', { error: 'string error' })
  })

  it('handles async handlers', async () => {
    const log = createMockLogger()
    const order: number[] = []

    await fireHooks(
      log,
      async () => {
        await Promise.resolve()
        order.push(1)
      },
      async () => {
        await Promise.resolve()
        order.push(2)
      }
    )

    expect(order).toEqual([1, 2])
  })

  it('swallows async errors and continues', async () => {
    const log = createMockLogger()
    const after = vi.fn()

    await fireHooks(
      log,
      async () => {
        throw new Error('async boom')
      },
      after
    )

    expect(log.warn).toHaveBeenCalledWith('hook error', { error: 'async boom' })
    expect(after).toHaveBeenCalledOnce()
  })

  it('does nothing with no handlers', async () => {
    const log = createMockLogger()
    await fireHooks(log)
    expect(log.warn).not.toHaveBeenCalled()
  })
})
