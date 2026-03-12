import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { isZodArray, isZodObject, toJsonSchema } from '@/utils/zod.js'

describe('toJsonSchema', () => {
  it('converts an object schema to JSON Schema', () => {
    const schema = z.object({ name: z.string() })
    const result = toJsonSchema(schema)

    expect(result.type).toBe('object')
    expect(result.properties).toHaveProperty('name')
    expect(result.required).toContain('name')
  })

  it('converts an array schema to JSON Schema', () => {
    const schema = z.array(z.number())
    const result = toJsonSchema(schema)

    expect(result.type).toBe('array')
  })

  it('converts a string schema to JSON Schema', () => {
    const result = toJsonSchema(z.string())
    expect(result.type).toBe('string')
  })

  it('converts a number schema to JSON Schema', () => {
    const result = toJsonSchema(z.number())
    expect(result.type).toBe('number')
  })

  it('converts a boolean schema to JSON Schema', () => {
    const result = toJsonSchema(z.boolean())
    expect(result.type).toBe('boolean')
  })
})

describe('isZodObject', () => {
  it('returns true for object schemas', () => {
    expect(isZodObject(z.object({ x: z.number() }))).toBe(true)
  })

  it('returns false for array schemas', () => {
    expect(isZodObject(z.array(z.string()))).toBe(false)
  })

  it('returns false for primitive schemas', () => {
    expect(isZodObject(z.string())).toBe(false)
    expect(isZodObject(z.number())).toBe(false)
    expect(isZodObject(z.boolean())).toBe(false)
  })
})

describe('isZodArray', () => {
  it('returns true for array schemas', () => {
    expect(isZodArray(z.array(z.string()))).toBe(true)
  })

  it('returns false for object schemas', () => {
    expect(isZodArray(z.object({ x: z.number() }))).toBe(false)
  })

  it('returns false for primitive schemas', () => {
    expect(isZodArray(z.string())).toBe(false)
    expect(isZodArray(z.number())).toBe(false)
    expect(isZodArray(z.boolean())).toBe(false)
  })
})
