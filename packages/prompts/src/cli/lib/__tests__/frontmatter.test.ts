import { describe, expect, it } from 'vitest'

import { parseFrontmatter } from '@/cli/lib/frontmatter.js'

describe('parseFrontmatter', () => {
  it('parses name from frontmatter', () => {
    const content = '---\nname: my-prompt\n---\nHello'
    const result = parseFrontmatter(content, 'test.prompt')
    expect(result.name).toBe('my-prompt')
  })

  it('parses group and version', () => {
    const content = '---\nname: test\ngroup: agents/test\nversion: 2\n---\nBody'
    const result = parseFrontmatter(content, 'test.prompt')
    expect(result.group).toBe('agents/test')
    expect(result.version).toBe('2')
  })

  it('parses schema with shorthand type strings', () => {
    const content = '---\nname: test\nschema:\n  scope: string\n  target: string\n---\n'
    const result = parseFrontmatter(content, 'test.prompt')
    expect(result.schema).toEqual([
      { name: 'scope', type: 'string', required: true },
      { name: 'target', type: 'string', required: true },
    ])
  })

  it('parses schema with full object definitions', () => {
    const content = [
      '---',
      'name: test',
      'schema:',
      '  scope:',
      '    type: string',
      '    description: The scope',
      '  target:',
      '    type: string',
      '    required: false',
      '---',
      '',
    ].join('\n')
    const result = parseFrontmatter(content, 'test.prompt')
    expect(result.schema).toEqual([
      { name: 'scope', type: 'string', required: true, description: 'The scope' },
      { name: 'target', type: 'string', required: false },
    ])
  })

  it('returns empty schema when no schema field', () => {
    const content = '---\nname: test\n---\nBody'
    const result = parseFrontmatter(content, 'test.prompt')
    expect(result.schema).toEqual([])
  })

  it('throws on missing frontmatter', () => {
    expect(() => parseFrontmatter('No frontmatter', 'test.prompt')).toThrow('No frontmatter')
  })

  it('throws on missing name', () => {
    expect(() => parseFrontmatter('---\nversion: 1\n---\n', 'test.prompt')).toThrow(
      'Missing or empty "name"'
    )
  })

  it('throws on invalid name format', () => {
    expect(() => parseFrontmatter('---\nname: My Prompt\n---\n', 'test.prompt')).toThrow(
      'Invalid prompt name'
    )
  })

  it('returns undefined group when not specified', () => {
    const content = '---\nname: test\n---\nBody'
    const result = parseFrontmatter(content, 'test.prompt')
    expect(result.group).toBeUndefined()
  })
})
