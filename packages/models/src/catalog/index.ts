import type { LiteralUnion } from "type-fest";

import type { ModelCapabilities, ModelDefinition, ModelModalities, ModelPricing } from "./types.js";
import { MODELS as GENERATED_MODELS } from "@/catalog/providers/index.js";

export type { ModelCapabilities, ModelDefinition, ModelModalities, ModelPricing };

/**
 * Known model identifiers from the generated catalog.
 */
export type KnownModelId = (typeof GENERATED_MODELS)[number]["id"];

/**
 * A model identifier that suggests known models but accepts any string.
 *
 * Provides autocomplete for cataloged models while allowing arbitrary
 * model IDs for new or custom models not yet in the catalog.
 */
export type ModelId = LiteralUnion<KnownModelId, string>;

/**
 * All supported models with pricing and capability data.
 */
export const MODELS = GENERATED_MODELS satisfies readonly ModelDefinition[];

/**
 * Look up a model definition by its identifier.
 *
 * Returns `null` when the ID is not in the catalog — callers should
 * handle missing models gracefully (e.g. custom or newly released models).
 *
 * @param id - The model identifier to look up.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * const m = model('gpt-4.1')
 * if (m) {
 *   console.log(m.pricing.input)
 *   console.log(m.capabilities.reasoning)
 * }
 * ```
 */
export function model(id: ModelId): ModelDefinition | null {
  return MODELS.find((m) => m.id === id) ?? null;
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
 * const reasoning = models((m) => m.capabilities.reasoning)
 * const vision = models((m) => m.modalities.input.includes('image'))
 * ```
 */
export function models(filter?: (m: ModelDefinition) => boolean): readonly ModelDefinition[] {
  return filter ? MODELS.filter(filter) : MODELS;
}
