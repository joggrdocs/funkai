import { describe, expect, it } from 'vitest'

import { extractVariables } from '@/lib/extract-variables.js'

describe('extractVariables', () => {
  it('extracts simple variables', () => {
    expect(extractVariables('{{ name }}')).toEqual(['name'])
  })

  it('extracts multiple variables sorted alphabetically', () => {
    expect(extractVariables('{{ b }} {{ a }}')).toEqual(['a', 'b'])
  })

  it('extracts the root name from filtered variables', () => {
    const result = extractVariables('{{ name | upcase }}')
    expect(result).toEqual(['name'])
  })

  it('extracts the root name from nested property access', () => {
    const result = extractVariables('{{ user.name }}')
    expect(result).toEqual(['user'])
  })

  it('deduplicates repeated variables', () => {
    expect(extractVariables('{{ x }} {{ x }}')).toEqual(['x'])
  })

  it('extracts variables from for loops', () => {
    const result = extractVariables('{% for item in items %}{{ item }}{% endfor %}')
    expect(result).toContain('items')
  })

  it('throws on dangerous variable names', () => {
    expect(() => extractVariables('{{ __proto__ }}')).toThrow('Dangerous variable name')
    expect(() => extractVariables('{{ constructor }}')).toThrow('Dangerous variable name')
    expect(() => extractVariables('{{ prototype }}')).toThrow('Dangerous variable name')
  })

  it('returns empty array for templates with no variables', () => {
    expect(extractVariables('Hello world')).toEqual([])
  })

  it('extracts variables from conditional blocks', () => {
    const result = extractVariables('{% if show_header %}Header{% endif %}')
    expect(result).toContain('show_header')
  })
})
