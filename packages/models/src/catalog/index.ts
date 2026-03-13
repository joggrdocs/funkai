import type { LiteralUnion } from "type-fest";

import type { ModelCategory, ModelDefinition, ModelPricing } from "./types.js";
import { MODELS as GENERATED_MODELS } from "@/catalog/providers/index.js";

export type { ModelCategory, ModelDefinition, ModelPricing };

/**
 * Supported model identifiers, derived from the generated {@link MODELS} array.
 */
export type OpenRouterLanguageModelId = (typeof GENERATED_MODELS)[number]["id"];

/**
 * A model identifier that suggests known models but accepts any string.
 *
 * Provides autocomplete for cataloged models while allowing arbitrary
 * model IDs for new or custom models not yet in the catalog.
 */
export type ModelId = LiteralUnion<OpenRouterLanguageModelId, string>;

/**
 * All supported models with pricing data.
 */
export const MODELS = GENERATED_MODELS satisfies readonly ModelDefinition[];

/**
 * Look up a model definition by its identifier.
 *
 * @param id - The model identifier to look up.
 * @returns The matching model definition.
 * @throws {Error} If no model matches the given ID.
 *
 * @example
 * ```typescript
 * const m = model('openai/gpt-5.2-codex')
 * console.log(m.pricing.prompt) // 0.00000175
 * console.log(m.category)       // 'coding'
 * ```
 */
export function model(id: ModelId): ModelDefinition {
  const found = MODELS.find((m) => m.id === id);
  if (!found) {
    throw new Error(
      `Unknown model: "${id}" (${MODELS.length} models in catalog). Use tryModel() for a non-throwing lookup.`,
    );
  }
  return found;
}

/**
 * Look up a model definition by its identifier, returning `undefined` if not found.
 *
 * Unlike {@link model}, this does not throw for unknown IDs — useful when
 * the caller can gracefully handle missing pricing (e.g. custom models).
 *
 * @param id - The model identifier to look up.
 * @returns The matching model definition, or `undefined`.
 *
 * @example
 * ```typescript
 * const m = tryModel('anthropic/claude-sonnet-4-20250514')
 * if (m) {
 *   console.log(m.pricing.prompt)
 * }
 * ```
 */
export function tryModel(id: ModelId): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id);
}

/**
 * Return supported model definitions, optionally filtered.
 *
 * @param filter - Optional predicate to filter models.
 * @returns A readonly array of matching model definitions.
 *
 * @example
 * ```typescript
 * const all = models()
 * const reasoning = models((m) => m.category === 'reasoning')
 * ```
 */
export function models(filter?: (m: ModelDefinition) => boolean): readonly ModelDefinition[] {
  return filter ? MODELS.filter(filter) : MODELS;
}
