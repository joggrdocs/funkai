import type { ZodType } from "zod";
import { z } from "zod";

type JSONSchema = z.core.JSONSchema.JSONSchema;

/**
 * Convert a Zod schema to a JSON Schema object.
 *
 * @param schema - The Zod schema to convert.
 * @returns The equivalent JSON Schema representation.
 * @example
 * ```ts
 * const jsonSchema = toJsonSchema(z.object({ name: z.string() }));
 * ```
 */
export function toJsonSchema(schema: ZodType): JSONSchema {
  return z.toJSONSchema(schema);
}

/**
 * Check if a Zod schema produces a JSON Schema with `type: 'object'`.
 *
 * Uses JSON Schema output rather than `instanceof` to correctly handle
 * wrapped schemas (transforms, refinements, pipes).
 *
 * @param schema - The Zod schema to check.
 * @returns `true` if the schema resolves to an object type.
 * @example
 * ```ts
 * isZodObject(z.object({ name: z.string() })); // true
 * isZodObject(z.string()); // false
 * ```
 */
export function isZodObject(schema: ZodType): boolean {
  return toJsonSchema(schema).type === "object";
}

/**
 * Check if a Zod schema produces a JSON Schema with `type: 'array'`.
 *
 * Uses JSON Schema output rather than `instanceof` to correctly handle
 * wrapped schemas (transforms, refinements, pipes).
 *
 * @param schema - The Zod schema to check.
 * @returns `true` if the schema resolves to an array type.
 * @example
 * ```ts
 * isZodArray(z.array(z.string())); // true
 * isZodArray(z.string()); // false
 * ```
 */
export function isZodArray(schema: ZodType): boolean {
  return toJsonSchema(schema).type === "array";
}
