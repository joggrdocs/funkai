import { describe, expect, it } from 'vitest'

import {
  buildToolCallId,
  createAssistantMessage,
  createToolCallMessage,
  createToolResultMessage,
  createUserMessage,
  formatToolCallEvent,
  formatToolResultEvent,
} from '@/core/agents/flow/messages.js'

// ---------------------------------------------------------------------------
// buildToolCallId
// ---------------------------------------------------------------------------

describe('buildToolCallId', () => {
  it('concatenates stepId and index with a dash', () => {
    expect(buildToolCallId('scan-repo', 0)).toBe('scan-repo-0')
    expect(buildToolCallId('write-doc', 3)).toBe('write-doc-3')
  })
})

// ---------------------------------------------------------------------------
// createToolCallMessage
// ---------------------------------------------------------------------------

describe('createToolCallMessage', () => {
  it('returns an assistant message with a tool-call content part', () => {
    const msg = createToolCallMessage('call-1', 'my-step', { x: 42 })

    expect(msg.role).toBe('assistant')
    expect(msg.content).toEqual([
      {
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'my-step',
        args: { x: 42 },
      },
    ])
  })

  it('defaults args to {} when null/undefined', () => {
    const msg = createToolCallMessage('call-1', 'step', undefined)

    const part = (msg.content as Array<{ args: unknown }>)[0]
    expect(part?.args).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// createToolResultMessage
// ---------------------------------------------------------------------------

describe('createToolResultMessage', () => {
  it('returns a tool message with a tool-result content part', () => {
    const msg = createToolResultMessage('call-1', 'my-step', { result: 'ok' })

    expect(msg.role).toBe('tool')
    expect(msg.content).toEqual([
      {
        type: 'tool-result',
        toolCallId: 'call-1',
        toolName: 'my-step',
        result: { result: 'ok' },
      },
    ])
  })

  it('includes isError when true', () => {
    const msg = createToolResultMessage('call-1', 'step', 'failed', true)

    const part = (msg.content as Array<Record<string, unknown>>)[0]
    expect(part?.isError).toBe(true)
  })

  it('omits isError when falsy', () => {
    const msg = createToolResultMessage('call-1', 'step', 'ok')

    const part = (msg.content as Array<Record<string, unknown>>)[0]
    expect(part?.isError).toBeUndefined()
  })

  it('defaults result to null when undefined', () => {
    const msg = createToolResultMessage('call-1', 'step', undefined)

    const part = (msg.content as Array<{ result: unknown }>)[0]
    expect(part?.result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createUserMessage
// ---------------------------------------------------------------------------

describe('createUserMessage', () => {
  it('creates a user message from a string input', () => {
    const msg = createUserMessage('hello world')

    expect(msg.role).toBe('user')
    expect(msg.content).toBe('hello world')
  })

  it('JSON-stringifies non-string input', () => {
    const msg = createUserMessage({ topic: 'TypeScript' })

    expect(msg.role).toBe('user')
    expect(msg.content).toBe('{"topic":"TypeScript"}')
  })
})

// ---------------------------------------------------------------------------
// createAssistantMessage
// ---------------------------------------------------------------------------

describe('createAssistantMessage', () => {
  it('creates an assistant message from a string output', () => {
    const msg = createAssistantMessage('response text')

    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('response text')
  })

  it('JSON-stringifies non-string output', () => {
    const msg = createAssistantMessage({ docs: ['a', 'b'] })

    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('{"docs":["a","b"]}')
  })
})

// ---------------------------------------------------------------------------
// formatToolCallEvent
// ---------------------------------------------------------------------------

describe('formatToolCallEvent', () => {
  it('returns a JSON string with type tool-call', () => {
    const event = formatToolCallEvent('call-1', 'my-step', { x: 1 })
    const parsed = JSON.parse(event)

    expect(parsed).toEqual({
      type: 'tool-call',
      toolCallId: 'call-1',
      toolName: 'my-step',
      args: { x: 1 },
    })
  })

  it('defaults args to {} when undefined', () => {
    const event = formatToolCallEvent('call-1', 'step', undefined)
    const parsed = JSON.parse(event)

    expect(parsed.args).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// formatToolResultEvent
// ---------------------------------------------------------------------------

describe('formatToolResultEvent', () => {
  it('returns a JSON string with type tool-result', () => {
    const event = formatToolResultEvent('call-1', 'my-step', { ok: true })
    const parsed = JSON.parse(event)

    expect(parsed).toEqual({
      type: 'tool-result',
      toolCallId: 'call-1',
      toolName: 'my-step',
      result: { ok: true },
    })
  })

  it('includes isError when true', () => {
    const event = formatToolResultEvent('call-1', 'step', 'err', true)
    const parsed = JSON.parse(event)

    expect(parsed.isError).toBe(true)
  })

  it('omits isError when falsy', () => {
    const event = formatToolResultEvent('call-1', 'step', 'ok')
    const parsed = JSON.parse(event)

    expect(parsed.isError).toBeUndefined()
  })

  it('defaults result to null when undefined', () => {
    const event = formatToolResultEvent('call-1', 'step', undefined)
    const parsed = JSON.parse(event)

    expect(parsed.result).toBeNull()
  })
})
