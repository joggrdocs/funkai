import { describe, expect, it } from 'vitest'

import { hasLintErrors, lintPrompt } from '@/lib/lint.js'

describe('lintPrompt', () => {
  it('returns no diagnostics when vars match schema', () => {
    const result = lintPrompt(
      'test',
      'test.prompt',
      [{ name: 'scope', type: 'string', required: true }],
      ['scope']
    )
    expect(result.diagnostics).toEqual([])
  })

  it('errors on undefined template variable', () => {
    const result = lintPrompt('test', 'test.prompt', [], ['scope'])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].level).toBe('error')
    expect(result.diagnostics[0].message).toContain('Undefined variable "scope"')
  })

  it('warns on unused schema variable', () => {
    const result = lintPrompt(
      'test',
      'test.prompt',
      [{ name: 'scope', type: 'string', required: true }],
      []
    )
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].level).toBe('warn')
    expect(result.diagnostics[0].message).toContain('Unused variable "scope"')
  })

  it('reports both errors and warnings', () => {
    const result = lintPrompt(
      'test',
      'test.prompt',
      [{ name: 'declared', type: 'string', required: true }],
      ['undeclared']
    )
    expect(result.diagnostics).toHaveLength(2)
    const levels = result.diagnostics.map((d) => d.level).toSorted()
    expect(levels).toEqual(['error', 'warn'])
  })

  it('returns no diagnostics for prompts with no schema and no vars', () => {
    const result = lintPrompt('test', 'test.prompt', [], [])
    expect(result.diagnostics).toEqual([])
  })
})

describe('hasLintErrors', () => {
  it('returns false when no errors', () => {
    const results = [{ name: 'test', filePath: 'test.prompt', diagnostics: [] }]
    expect(hasLintErrors(results)).toBe(false)
  })

  it('returns true when errors exist', () => {
    const results = [
      {
        name: 'test',
        filePath: 'test.prompt',
        diagnostics: [{ level: 'error' as const, message: 'oops' }],
      },
    ]
    expect(hasLintErrors(results)).toBe(true)
  })

  it('returns false when only warnings', () => {
    const results = [
      {
        name: 'test',
        filePath: 'test.prompt',
        diagnostics: [{ level: 'warn' as const, message: 'hmm' }],
      },
    ]
    expect(hasLintErrors(results)).toBe(false)
  })
})
