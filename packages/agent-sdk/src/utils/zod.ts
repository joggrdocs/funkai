import type { ZodType } from 'zod'
import { z } from 'zod'

type JSONSchema = z.core.JSONSchema.JSONSchema

/**
 * Convert a Zod schema to a JSON Schema object.
 */
export function toJsonSchema(schema: ZodType): JSONSchema {
  return z.toJSONSchema(schema)
}

/**
 * Check if a Zod schema produces a JSON Schema with `type: 'object'`.
 *
 * Uses JSON Schema output rather than `instanceof` to correctly handle
 * wrapped schemas (transforms, refinements, pipes).
 */
export function isZodObject(schema: ZodType): boolean {
  return toJsonSchema(schema).type === 'object'
}

/**
 * Check if a Zod schema produces a JSON Schema with `type: 'array'`.
 *
 * Uses JSON Schema output rather than `instanceof` to correctly handle
 * wrapped schemas (transforms, refinements, pipes).
 */
export function isZodArray(schema: ZodType): boolean {
  return toJsonSchema(schema).type === 'array'
}
