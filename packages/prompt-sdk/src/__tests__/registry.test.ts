import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createPromptRegistry } from '@/registry.js'

const mockPrompt = {
  name: 'test-prompt' as const,
  group: 'agents/test' as const,
  schema: z.object({ name: z.string() }),
  render(variables: { name: string }) {
    return `Hello ${variables.name}`
  },
  validate(variables: unknown) {
    return z.object({ name: z.string() }).parse(variables)
  },
}

const emptyPrompt = {
  name: 'empty' as const,
  group: undefined,
  schema: z.object({}),
  render() {
    return 'static'
  },
  validate(variables: unknown) {
    return z.object({}).parse(variables)
  },
}

describe('createPromptRegistry', () => {
  it('retrieves a registered prompt by name', () => {
    const registry = createPromptRegistry({ 'test-prompt': mockPrompt })
    const result = registry.get('test-prompt')
    expect(result.name).toBe('test-prompt')
    expect(result.render({ name: 'Alice' })).toBe('Hello Alice')
  })

  it('throws on unknown prompt name', () => {
    const registry = createPromptRegistry({ 'test-prompt': mockPrompt })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: testing error path with invalid prompt name
    expect(() => registry.get('unknown' as any)).toThrow('Unknown prompt: "unknown"')
  })

  it('reports registered names', () => {
    const registry = createPromptRegistry({
      'test-prompt': mockPrompt,
      empty: emptyPrompt,
    })
    expect(registry.names()).toEqual(['test-prompt', 'empty'])
  })

  it('checks existence with has()', () => {
    const registry = createPromptRegistry({ 'test-prompt': mockPrompt })
    expect(registry.has('test-prompt')).toBe(true)
    expect(registry.has('nope')).toBe(false)
  })

  it('works with empty registry', () => {
    const registry = createPromptRegistry({})
    expect(registry.names()).toEqual([])
    expect(registry.has('anything')).toBe(false)
  })
})
