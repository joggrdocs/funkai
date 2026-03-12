import { describe, expect, it } from 'vitest'

import { ok, err, isOk, isErr } from '@/utils/result.js'
import type { Result } from '@/utils/result.js'

describe('ok', () => {
  it('creates a success result with ok: true', () => {
    const result = ok({ output: 'hello' })
    expect(result.ok).toBe(true)
    expect(result.output).toBe('hello')
  })

  it('spreads all fields flat onto the result', () => {
    const result = ok({ output: 'text', messages: [], duration: 42 })
    expect(result).toEqual({
      ok: true,
      output: 'text',
      messages: [],
      duration: 42,
    })
  })
})

describe('err', () => {
  it('creates a failure result with ok: false', () => {
    const result = err('VALIDATION_ERROR', 'Name is required')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('VALIDATION_ERROR')
    expect(result.error.message).toBe('Name is required')
    expect(result.error.cause).toBeUndefined()
  })

  it('includes the cause when provided', () => {
    const cause = new Error('root cause')
    const result = err('AGENT_ERROR', 'something broke', cause)
    expect(result.error.cause).toBe(cause)
  })
})

describe('isOk', () => {
  it('returns true for success results', () => {
    const result: Result<{ value: number }> = ok({ value: 1 })
    expect(isOk(result)).toBe(true)
  })

  it('returns false for failure results', () => {
    const result: Result<{ value: number }> = err('ERR', 'fail')
    expect(isOk(result)).toBe(false)
  })

  it('narrows the type so success fields are accessible', () => {
    const result: Result<{ value: number }> = ok({ value: 42 })
    if (isOk(result)) {
      // This line would fail to compile if narrowing didn't work
      expect(result.value).toBe(42)
    }
  })
})

describe('isErr', () => {
  it('returns true for failure results', () => {
    const result: Result<{ value: number }> = err('ERR', 'fail')
    expect(isErr(result)).toBe(true)
  })

  it('returns false for success results', () => {
    const result: Result<{ value: number }> = ok({ value: 1 })
    expect(isErr(result)).toBe(false)
  })

  it('narrows the type so error fields are accessible', () => {
    const result: Result<{ value: number }> = err('MY_CODE', 'my message')
    if (isErr(result)) {
      // This line would fail to compile if narrowing didn't work
      expect(result.error.code).toBe('MY_CODE')
      expect(result.error.message).toBe('my message')
    }
  })
})
