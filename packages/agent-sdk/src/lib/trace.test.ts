import { describe, expect, it } from 'vitest'

import type { TokenUsage } from '@/core/provider/types.js'
import { collectUsages, snapshotTrace, type TraceEntry } from '@/lib/trace.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEntry(overrides?: Partial<TraceEntry>): TraceEntry {
  return {
    id: 'entry-1',
    type: 'step',
    startedAt: 1000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// snapshotTrace
// ---------------------------------------------------------------------------

describe('snapshotTrace', () => {
  it('returns a frozen array', () => {
    const trace = [createEntry()]
    const snapshot = snapshotTrace(trace)
    expect(Object.isFrozen(snapshot)).toBe(true)
  })

  it('freezes each entry in the array', () => {
    const trace = [createEntry(), createEntry({ id: 'entry-2' })]
    const snapshot = snapshotTrace(trace)
    expect(Object.isFrozen(snapshot[0])).toBe(true)
    expect(Object.isFrozen(snapshot[1])).toBe(true)
  })

  it('returns a structural clone, not the same references', () => {
    const original = createEntry({ output: { value: 42 } })
    const trace = [original]
    const snapshot = snapshotTrace(trace)

    const entry = snapshot[0] as TraceEntry
    expect(entry).not.toBe(original)
    expect(entry.id).toBe(original.id)
    expect(entry.output).toEqual({ value: 42 })
  })

  it('deep-freezes nested children', () => {
    const child: TraceEntry = createEntry({ id: 'child-1', type: 'agent' })
    const parent: TraceEntry = createEntry({
      id: 'parent-1',
      type: 'map',
      children: [child],
    })

    const snapshot = snapshotTrace([parent])

    const snapped = snapshot[0] as TraceEntry
    const snappedChildren = snapped.children as readonly TraceEntry[]
    expect(Object.isFrozen(snapped)).toBe(true)
    expect(Object.isFrozen(snappedChildren)).toBe(true)
    expect(Object.isFrozen(snappedChildren[0])).toBe(true)
  })

  it('handles deeply nested children (3 levels)', () => {
    const grandchild = createEntry({ id: 'grandchild', type: 'step' })
    const child = createEntry({ id: 'child', type: 'agent', children: [grandchild] })
    const root = createEntry({ id: 'root', type: 'map', children: [child] })

    const snapshot = snapshotTrace([root])

    const root0 = snapshot[0] as TraceEntry
    const root0Children = root0.children as readonly TraceEntry[]
    const mid = root0Children[0] as TraceEntry
    const midChildren = mid.children as readonly TraceEntry[]
    const deep = midChildren[0] as TraceEntry
    expect(Object.isFrozen(deep)).toBe(true)
    expect(deep.id).toBe('grandchild')
  })

  it('handles an empty trace array', () => {
    const snapshot = snapshotTrace([])
    expect(snapshot).toEqual([])
    expect(Object.isFrozen(snapshot)).toBe(true)
  })

  it('preserves all entry fields', () => {
    const error = new Error('test failure')
    const usage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    }
    const entry = createEntry({
      id: 'full-entry',
      type: 'reduce',
      input: { items: [1, 2, 3] },
      output: { total: 6 },
      startedAt: 1000,
      finishedAt: 2000,
      error,
      usage,
    })

    const snapshot = snapshotTrace([entry])
    const snapped = snapshot[0] as TraceEntry

    expect(snapped.id).toBe('full-entry')
    expect(snapped.type).toBe('reduce')
    expect(snapped.input).toEqual({ items: [1, 2, 3] })
    expect(snapped.output).toEqual({ total: 6 })
    expect(snapped.startedAt).toBe(1000)
    expect(snapped.finishedAt).toBe(2000)
    expect(snapped.error).toBe(error)
    expect(snapped.usage).toEqual(usage)
  })

  it('does not modify the original trace', () => {
    const trace = [createEntry({ id: 'original' })]
    snapshotTrace(trace)

    // Original should remain unfrozen and mutable
    const original = trace[0] as TraceEntry
    expect(Object.isFrozen(trace)).toBe(false)
    expect(Object.isFrozen(original)).toBe(false)
    original.id = 'mutated'
    expect(original.id).toBe('mutated')
  })

  it('handles entries without children property', () => {
    const entry = createEntry({ id: 'no-children' })
    const snapshot = snapshotTrace([entry])
    const snapped = snapshot[0] as TraceEntry
    expect(snapped.children).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// TraceEntry shape
// ---------------------------------------------------------------------------

describe('TraceEntry', () => {
  it('supports all operation types', () => {
    const types = ['step', 'agent', 'map', 'each', 'reduce', 'while', 'all', 'race'] as const
    const entries: TraceEntry[] = types.map((type) => createEntry({ id: type, type }))

    expect(entries).toHaveLength(8)
    entries.forEach((entry, i) => {
      // eslint-disable-next-line security/detect-object-injection -- Array index from forEach callback, not user input
      expect(entry.type).toBe(types[i])
    })
  })

  it('allows optional fields to be undefined', () => {
    const entry = createEntry()
    expect(entry.input).toBeUndefined()
    expect(entry.output).toBeUndefined()
    expect(entry.finishedAt).toBeUndefined()
    expect(entry.error).toBeUndefined()
    expect(entry.usage).toBeUndefined()
    expect(entry.children).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Helpers for collectUsages
// ---------------------------------------------------------------------------

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
}

function createUsage(overrides?: Partial<TokenUsage>): TokenUsage {
  return { ...ZERO_USAGE, ...overrides }
}

// ---------------------------------------------------------------------------
// collectUsages()
// ---------------------------------------------------------------------------

describe('collectUsages()', () => {
  it('returns empty array for an empty trace', () => {
    const result = collectUsages([])

    expect(result).toEqual([])
  })

  it('returns empty array when no entries have usage', () => {
    const trace = [createEntry({ id: 'step-1' }), createEntry({ id: 'step-2' })]

    const result = collectUsages(trace)

    expect(result).toEqual([])
  })

  it('collects usage from a single entry', () => {
    const usage = createUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 })
    const trace = [createEntry({ id: 'agent-1', type: 'agent', usage })]

    const result = collectUsages(trace)

    expect(result).toEqual([usage])
  })

  it('collects usage across multiple entries', () => {
    const usageA = createUsage({ inputTokens: 100 })
    const usageB = createUsage({ inputTokens: 200 })
    const trace = [
      createEntry({ id: 'agent-1', type: 'agent', usage: usageA }),
      createEntry({ id: 'agent-2', type: 'agent', usage: usageB }),
    ]

    const result = collectUsages(trace)

    expect(result).toEqual([usageA, usageB])
  })

  it('skips entries without usage', () => {
    const usage = createUsage({ inputTokens: 100 })
    const trace = [
      createEntry({ id: 'step-1', type: 'step' }),
      createEntry({ id: 'agent-1', type: 'agent', usage }),
      createEntry({ id: 'step-2', type: 'step' }),
    ]

    const result = collectUsages(trace)

    expect(result).toEqual([usage])
  })

  it('recursively collects usage from children', () => {
    const childUsage = createUsage({ inputTokens: 50 })
    const trace = [
      createEntry({
        id: 'map-1',
        type: 'map',
        children: [createEntry({ id: 'agent-child', type: 'agent', usage: childUsage })],
      }),
    ]

    const result = collectUsages(trace)

    expect(result).toEqual([childUsage])
  })

  it('collects usage from parent and nested children', () => {
    const parentUsage = createUsage({ inputTokens: 100 })
    const childUsage = createUsage({ inputTokens: 200 })
    const trace = [
      createEntry({ id: 'agent-top', type: 'agent', usage: parentUsage }),
      createEntry({
        id: 'map-1',
        type: 'map',
        children: [createEntry({ id: 'agent-nested', type: 'agent', usage: childUsage })],
      }),
    ]

    const result = collectUsages(trace)

    expect(result).toEqual([parentUsage, childUsage])
  })

  it('handles deeply nested children (3 levels)', () => {
    const deepUsage = createUsage({ inputTokens: 42 })
    const trace = [
      createEntry({
        id: 'root',
        type: 'map',
        children: [
          createEntry({
            id: 'mid',
            type: 'step',
            children: [createEntry({ id: 'deep-agent', type: 'agent', usage: deepUsage })],
          }),
        ],
      }),
    ]

    const result = collectUsages(trace)

    expect(result).toEqual([deepUsage])
  })
})
