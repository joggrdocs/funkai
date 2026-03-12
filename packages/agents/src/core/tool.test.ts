import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { tool } from '@/core/tool.js'

const greetTool = tool({
  description: 'Greet a person by name',
  inputSchema: z.object({ name: z.string() }),
  execute: async ({ name }) => ({
    message: `Hello, ${name}!`,
  }),
})

describe('tool', () => {
  it('returns an object with description, inputSchema, and execute', () => {
    expect(greetTool).toHaveProperty('description', 'Greet a person by name')
    expect(greetTool).toHaveProperty('inputSchema')
    expect(greetTool).toHaveProperty('execute')
  })

  it('executes and returns the expected output', async () => {
    if (greetTool.execute == null) {
      throw new Error('Expected greetTool.execute to be defined')
    }
    const result = await greetTool.execute({ name: 'Ada' }, { toolCallId: 'test', messages: [] })
    expect(result).toEqual({ message: 'Hello, Ada!' })
  })

  it('wraps inputSchema as an AI SDK schema with jsonSchema', () => {
    expect(greetTool.inputSchema).toHaveProperty('jsonSchema')
  })

  it('wraps outputSchema when provided', () => {
    const t = tool({
      description: 'Tool with output schema',
      inputSchema: z.object({ x: z.number() }),
      outputSchema: z.object({ result: z.number() }),
      execute: async ({ x }) => ({ result: x * 2 }),
    })

    expect(t).toHaveProperty('outputSchema')
  })

  it('sets title when provided', () => {
    const t = tool({
      description: 'Tool with title',
      title: 'My Tool',
      inputSchema: z.object({ x: z.number() }),
      execute: async ({ x }) => x,
    })

    expect(t).toHaveProperty('title', 'My Tool')
  })

  it('sets inputExamples when provided', () => {
    const t = tool({
      description: 'Tool with examples',
      inputSchema: z.object({ x: z.number() }),
      inputExamples: [{ input: { x: 42 } }],
      execute: async ({ x }) => x,
    })

    expect(t).toHaveProperty('inputExamples')
  })
})
