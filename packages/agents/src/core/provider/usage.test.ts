import { describe, expect, it } from 'vitest'

import type { TokenUsage, TokenUsageRecord } from '@/core/provider/types.js'
import { agentUsage, sumTokenUsage, flowAgentUsage } from '@/core/provider/usage.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRecord(overrides?: Partial<TokenUsageRecord>): TokenUsageRecord {
  return {
    modelId: 'openai/gpt-5.2-codex',
    inputTokens: undefined,
    outputTokens: undefined,
    totalTokens: undefined,
    cacheReadTokens: undefined,
    cacheWriteTokens: undefined,
    reasoningTokens: undefined,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// agentUsage()
// ---------------------------------------------------------------------------

describe('agentUsage()', () => {
  it('returns zero counts for a record with all undefined fields', () => {
    const result = agentUsage('agent-1', createRecord())

    expect(result).toEqual({
      agentId: 'agent-1',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    })
  })

  it('passes through defined token counts from a single record', () => {
    const record = createRecord({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 10,
      cacheWriteTokens: 5,
      reasoningTokens: 20,
    })

    const result = agentUsage('agent-2', record)

    expect(result.agentId).toBe('agent-2')
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(50)
    expect(result.totalTokens).toBe(150)
    expect(result.cacheReadTokens).toBe(10)
    expect(result.cacheWriteTokens).toBe(5)
    expect(result.reasoningTokens).toBe(20)
  })

  it('accepts a single record (not wrapped in array)', () => {
    const record = createRecord({ inputTokens: 42 })

    const result = agentUsage('agent-single', record)

    expect(result.inputTokens).toBe(42)
  })

  it('aggregates token counts across multiple records', () => {
    const records: TokenUsageRecord[] = [
      createRecord({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }),
      createRecord({ inputTokens: 200, outputTokens: 100, totalTokens: 300 }),
      createRecord({ inputTokens: 50, outputTokens: 25, totalTokens: 75 }),
    ]

    const result = agentUsage('agent-multi', records)

    expect(result.inputTokens).toBe(350)
    expect(result.outputTokens).toBe(175)
    expect(result.totalTokens).toBe(525)
  })

  it('treats undefined fields as 0 during aggregation', () => {
    const records: TokenUsageRecord[] = [
      createRecord({ inputTokens: 100, cacheReadTokens: undefined }),
      createRecord({ inputTokens: undefined, cacheReadTokens: 30 }),
    ]

    const result = agentUsage('agent-mixed', records)

    expect(result.inputTokens).toBe(100)
    expect(result.cacheReadTokens).toBe(30)
  })

  it('returns zero counts for an empty array', () => {
    const result = agentUsage('agent-empty', [])

    expect(result.inputTokens).toBe(0)
    expect(result.outputTokens).toBe(0)
    expect(result.totalTokens).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// flowAgentUsage()
// ---------------------------------------------------------------------------

describe('flowAgentUsage()', () => {
  it('groups records by source.agentId and returns per-agent usage', () => {

    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        source: { agentId: 'agent-a', scope: [] },
      }),
      createRecord({
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
        source: { agentId: 'agent-b', scope: [] },
      }),
      createRecord({
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
        source: { agentId: 'agent-a', scope: [] },
      }),
    ]

    const result = flowAgentUsage(records)

    expect(result.usages).toHaveLength(2)

    const agentA = result.usages.find((u) => u.agentId === 'agent-a')
    if (!agentA) {
      throw new Error('Expected agent-a usage to exist')
    }
    expect(agentA.inputTokens).toBe(150)
    expect(agentA.outputTokens).toBe(75)
    expect(agentA.totalTokens).toBe(225)

    const agentB = result.usages.find((u) => u.agentId === 'agent-b')
    if (!agentB) {
      throw new Error('Expected agent-b usage to exist')
    }
    expect(agentB.inputTokens).toBe(200)
    expect(agentB.outputTokens).toBe(100)
    expect(agentB.totalTokens).toBe(300)
  })

  it('assigns records without source to "unknown" agent', () => {
    const records: TokenUsageRecord[] = [
      createRecord({ inputTokens: 100 }),
      createRecord({ inputTokens: 50 }),
    ]

    const result = flowAgentUsage(records)

    expect(result.usages).toHaveLength(1)
    const unknown = result.usages[0]
    if (!unknown) {
      throw new Error('Expected unknown usage to exist')
    }
    expect(unknown.agentId).toBe('unknown')
    expect(unknown.inputTokens).toBe(150)
  })

  it('assigns records with source but no agentId to "unknown"', () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 75,
        source: { agentId: undefined as unknown as string, scope: [] },
      }),
    ]

    const result = flowAgentUsage(records)

    expect(result.usages).toHaveLength(1)
    const unknown = result.usages[0]
    if (!unknown) {
      throw new Error('Expected unknown usage to exist')
    }
    expect(unknown.agentId).toBe('unknown')
  })

  it('returns empty usages array for empty records', () => {
    const result = flowAgentUsage([])

    expect(result.usages).toEqual([])
  })

  it('preserves workflow and step IDs in source grouping', () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 10,
        source: { agentId: 'agent-x', workflowId: 'wf-1', stepId: 'step-1', scope: ['a'] },
      }),
      createRecord({
        inputTokens: 20,
        source: { agentId: 'agent-x', workflowId: 'wf-1', stepId: 'step-2', scope: ['b'] },
      }),
    ]

    const result = flowAgentUsage(records)

    expect(result.usages).toHaveLength(1)
    const agentX = result.usages[0]
    if (!agentX) {
      throw new Error('Expected agent-x usage to exist')
    }
    expect(agentX.agentId).toBe('agent-x')
    expect(agentX.inputTokens).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// Helpers for sumTokenUsage
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
// sumTokenUsage()
// ---------------------------------------------------------------------------

describe('sumTokenUsage()', () => {
  it('sums all fields across multiple usage objects', () => {
    const usages = [
      createUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }),
      createUsage({ inputTokens: 200, outputTokens: 100, totalTokens: 300 }),
    ]

    const result = sumTokenUsage(usages)

    expect(result.inputTokens).toBe(300)
    expect(result.outputTokens).toBe(150)
    expect(result.totalTokens).toBe(450)
  })

  it('sums cache and reasoning token fields', () => {
    const usages = [
      createUsage({ cacheReadTokens: 10, cacheWriteTokens: 5, reasoningTokens: 20 }),
      createUsage({ cacheReadTokens: 30, cacheWriteTokens: 15, reasoningTokens: 40 }),
    ]

    const result = sumTokenUsage(usages)

    expect(result.cacheReadTokens).toBe(40)
    expect(result.cacheWriteTokens).toBe(20)
    expect(result.reasoningTokens).toBe(60)
  })

  it('returns zero usage for an empty array', () => {
    const result = sumTokenUsage([])

    expect(result).toEqual(ZERO_USAGE)
  })

  it('returns the same values for a single-element array', () => {
    const usage = createUsage({ inputTokens: 42, outputTokens: 21, totalTokens: 63 })

    const result = sumTokenUsage([usage])

    expect(result).toEqual(usage)
  })

  it('sums three or more usage objects', () => {
    const usages = [
      createUsage({ inputTokens: 100 }),
      createUsage({ inputTokens: 200 }),
      createUsage({ inputTokens: 50 }),
    ]

    const result = sumTokenUsage(usages)

    expect(result.inputTokens).toBe(350)
  })

  it('does not mutate any input', () => {
    const a = createUsage({ inputTokens: 100 })
    const b = createUsage({ inputTokens: 200 })
    const aCopy = { ...a }
    const bCopy = { ...b }

    sumTokenUsage([a, b])

    expect(a).toEqual(aCopy)
    expect(b).toEqual(bCopy)
  })
})
