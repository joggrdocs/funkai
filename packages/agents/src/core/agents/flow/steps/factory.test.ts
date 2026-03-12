import { match } from 'ts-pattern'
import { describe, expect, it, vi } from 'vitest'

import type { Agent, GenerateResult } from '@/core/agents/base/types.js'
import { createStepBuilder } from '@/core/agents/flow/steps/factory.js'
import { createMockCtx } from '@/testing/index.js'
import type { Result } from '@/utils/result.js'

// ---------------------------------------------------------------------------
// step() — the core primitive
// ---------------------------------------------------------------------------

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

  it('fires hooks in order: onStart → execute → onFinish', async () => {
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

  it('fires parent hooks at correct points', async () => {
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
      parentHooks: {
        onStepFinish: parentFinish,
      },
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

  it('fireHooks swallows hook errors without breaking execution and logs warning', async () => {
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

  it('registers trace entries', async () => {
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

  it('increments step index across calls (shared ref)', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const r1 = await $.step({ id: 'a', execute: async () => ({}) })
    const r2 = await $.step({ id: 'b', execute: async () => ({}) })
    const r3 = await $.step({ id: 'c', execute: async () => ({}) })

    expect(r1.step.index).toBe(0)
    expect(r2.step.index).toBe(1)
    expect(r3.step.index).toBe(2)
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

  it('handles primitive string return via value field', async () => {
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

  it('handles primitive number return via value field', async () => {
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
})

// ---------------------------------------------------------------------------
// agent() — delegates to step() with agent.generate() unwrap
// ---------------------------------------------------------------------------

describe('agent()', () => {
  const MOCK_USAGE = {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
  }

  function mockAgent(result: Result<Pick<GenerateResult, 'output' | 'messages'>>): Agent<string> {
    const resolved: Result<GenerateResult> = match(result)
      .with({ ok: true }, (r) => ({ ...r, usage: MOCK_USAGE, finishReason: 'stop' as const }))
      .otherwise((r) => r)
    return {
      generate: vi.fn(async () => resolved),
      stream: vi.fn(),
      fn: vi.fn(),
    } as unknown as Agent<string>
  }

  it('unwraps successful agent result into StepResult', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({
      ok: true,
      output: 'hello',
      messages: [],
    })

    const result = await $.agent({ id: 'ag', agent, input: 'test' })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value.output).toBe('hello')
    expect(result.value.messages).toEqual([])
    expect(result.value.usage).toEqual(MOCK_USAGE)
    expect(result.value.finishReason).toBe('stop')
    expect(result.step.type).toBe('agent')
  })

  it('converts agent error result into StepError', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({
      ok: false,
      error: { code: 'AGENT_ERROR', message: 'agent failed', cause: new Error('root') },
    })

    const result = await $.agent({ id: 'ag-err', agent, input: 'test' })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.code).toBe('STEP_ERROR')
    expect(result.error.stepId).toBe('ag-err')
  })

  it('calls agent.generate with input and config', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({ ok: true, output: 'hi', messages: [] })
    const config = { signal: new AbortController().signal }

    await $.agent({ id: 'ag-cfg', agent, input: 'hello', config })

    expect(agent.generate).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ signal: config.signal, logger: expect.any(Object) })
    )
  })

  it('propagates ctx.signal to agent when no user signal is provided', async () => {
    const controller = new AbortController()
    const ctx = createMockCtx({ signal: controller.signal })
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({ ok: true, output: 'hi', messages: [] })

    await $.agent({ id: 'ag-ctx-signal', agent, input: 'test' })

    expect(agent.generate).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('user-provided config.signal takes precedence over ctx.signal', async () => {
    const ctxController = new AbortController()
    const userController = new AbortController()
    const ctx = createMockCtx({ signal: ctxController.signal })
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({ ok: true, output: 'hi', messages: [] })

    await $.agent({
      id: 'ag-user-signal',
      agent,
      input: 'test',
      config: { signal: userController.signal },
    })

    expect(agent.generate).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ signal: userController.signal })
    )
  })

  it('records input in trace', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({ ok: true, output: 'hi', messages: [] })

    await $.agent({ id: 'ag-trace', agent, input: 'my-input' })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.input).toBe('my-input')
  })

  it('records usage on trace entry for successful agent step', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({ ok: true, output: 'hi', messages: [] })

    await $.agent({ id: 'ag-usage-trace', agent, input: 'test' })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.usage).toEqual(MOCK_USAGE)
  })

  it('does not record usage on trace entry for failed agent step', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const agent = mockAgent({
      ok: false,
      error: { code: 'AGENT_ERROR', message: 'failed' },
    })

    await $.agent({ id: 'ag-no-usage', agent, input: 'test' })

    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.usage).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// map() — delegates to step() with parallel execution
// ---------------------------------------------------------------------------

describe('map()', () => {
  it('maps items in parallel via Promise.all by default', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-all',
      input: [1, 2, 3],
      execute: async ({ item }) => ({ doubled: item * 2 }),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    // StepResult<R[]> spreads the array — it's on the result as the value
    // Since T = { doubled: number }[], the spread puts the array properties on result
    // Actually, for array types, `T & { ok: true, ... }` means array methods are available
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
        return { v: item }
      },
    })

    expect(state.maxConcurrent).toBeLessThanOrEqual(2)
  })

  it('returns results in input order', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.map({
      id: 'map-order',
      input: [3, 1, 2],
      concurrency: 2,
      execute: async ({ item }) => {
        await new Promise((r) => setTimeout(r, item * 5))
        return { v: item }
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    // The trace output should have items in original order
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    const output = traceEntry.output as Array<{ v: number }>
    expect(output.map((o) => o.v)).toEqual([3, 1, 2])
  })
})

// ---------------------------------------------------------------------------
// each() — delegates to step() with sequential iteration
// ---------------------------------------------------------------------------

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
  })
})

// ---------------------------------------------------------------------------
// reduce() — delegates to step() with accumulator loop
// ---------------------------------------------------------------------------

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
    // The result of reduce is a number — spread onto the object
    // For primitive types, the spread doesn't add properties,
    // but the trace output captures it
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.output).toBe(10)
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
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.output).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// while() — delegates to step() with conditional loop
// ---------------------------------------------------------------------------

describe('while()', () => {
  it('loops while condition is true', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.while({
      id: 'while-count',
      condition: ({ index }) => index < 3,
      execute: async ({ index }) => ({ count: index }),
    })

    expect(result.ok).toBe(true)
    expect(result.step.type).toBe('while')
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    const output = traceEntry.output as { count: number }
    expect(output.count).toBe(2)
  })

  it('returns undefined when condition is initially false', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.while({
      id: 'while-none',
      condition: () => false,
      execute: async () => ({ v: 1 }),
    })

    expect(result.ok).toBe(true)
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.output).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// all() — delegates to step() with Promise.all
// ---------------------------------------------------------------------------

describe('all()', () => {
  it('resolves all entries concurrently', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.all({
      id: 'all-entries',
      entries: [() => Promise.resolve('a'), () => Promise.resolve('b'), () => Promise.resolve('c')],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    const output = traceEntry.output as string[]
    expect(output).toEqual(['a', 'b', 'c'])
    expect(result.step.type).toBe('all')
  })

  it('fails fast on first error', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.all({
      id: 'all-fail',
      entries: [
        () => Promise.resolve('a'),
        () => Promise.reject(new Error('fail')),
        () => Promise.resolve('c'),
      ],
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.message).toBe('fail')
  })

  it('passes abort signal to entry factories', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const receivedSignals: AbortSignal[] = []

    await $.all({
      id: 'all-signal',
      entries: [
        (signal) => {
          receivedSignals.push(signal)
          return Promise.resolve('a')
        },
        (signal) => {
          receivedSignals.push(signal)
          return Promise.resolve('b')
        },
      ],
    })

    expect(receivedSignals).toHaveLength(2)
    expect(receivedSignals[0]).toBeInstanceOf(AbortSignal)
    expect(receivedSignals[1]).toBeInstanceOf(AbortSignal)
  })
})

// ---------------------------------------------------------------------------
// race() — delegates to step() with Promise.race
// ---------------------------------------------------------------------------

describe('race()', () => {
  it('returns first resolved value', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })

    const result = await $.race({
      id: 'race-first',
      entries: [
        () => new Promise((r) => setTimeout(() => r('slow'), 50)),
        () => Promise.resolve('fast'),
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const traceEntry = ctx.trace[0]
    if (traceEntry === undefined) {
      throw new Error('Expected trace entry')
    }
    expect(traceEntry.output).toBe('fast')
    expect(result.step.type).toBe('race')
  })

  it('cancels losing entries via abort signal', async () => {
    const ctx = createMockCtx()
    const $ = createStepBuilder({ ctx })
    const signals: { loser: AbortSignal | undefined } = { loser: undefined }

    const result = await $.race({
      id: 'race-cancel',
      entries: [
        () => Promise.resolve('winner'),
        (signal) => {
          signals.loser = signal
          return new Promise((r) => setTimeout(() => r('loser'), 500))
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).toBe('winner')
    if (signals.loser === undefined) {
      throw new Error('Expected loser signal')
    }
    expect(signals.loser.aborted).toBe(true)
  })
})
