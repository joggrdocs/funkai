// ──────────────────────────────────────────────────────────────
//  █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗
// ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║
// ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
//
// AUTO-GENERATED — DO NOT EDIT
// Update: pnpm --filter=@pkg/agent-sdk generate:models
// ──────────────────────────────────────────────────────────────

import { P, match } from "ts-pattern";
import type { LiteralUnion } from "type-fest";

import { OPENAI_MODELS } from "@/core/models/providers/openai.js";

const GENERATED_MODELS = [...OPENAI_MODELS] as const;

/**
 * Supported OpenRouter model identifiers, derived from the generated {@link MODELS} array.
 */
export type OpenRouterLanguageModelId = (typeof GENERATED_MODELS)[number]["id"];

/**
 * A model identifier that suggests known OpenRouter models but accepts any string.
 *
 * Provides autocomplete for cataloged models while allowing arbitrary
 * model IDs for new or custom models not yet in the catalog.
 */
export type ModelId = LiteralUnion<OpenRouterLanguageModelId, string>;

/**
 * Model category for classification and filtering.
 */
export type ModelCategory = "chat" | "coding" | "reasoning";

/**
 * Per-model pricing in USD per token.
 *
 * Field names match the OpenRouter API convention. All values are
 * per-token (or per-unit) rates as numbers. Optional fields are
 * omitted when the provider does not support them.
 */
export interface ModelPricing {
  /** Cost per input (prompt) token. */
  prompt: number;

  /** Cost per output (completion) token. */
  completion: number;

  /** Cost per cached input token (read). */
  inputCacheRead?: number;

  /** Cost per cached input token (write). */
  inputCacheWrite?: number;

  /** Cost per web search request. */
  webSearch?: number;

  /** Cost per internal reasoning token. */
  internalReasoning?: number;

  /** Cost per image input token. */
  image?: number;

  /** Cost per audio input second. */
  audio?: number;

  /** Cost per audio output second. */
  audioOutput?: number;
}

/**
 * Model definition with metadata and pricing.
 */
export interface ModelDefinition {
  /** OpenRouter model identifier (e.g. `"openai/gpt-5.2-codex"`). */
  id: string;

  /** Model category for classification. */
  category: ModelCategory;

  /** Token pricing rates. */
  pricing: ModelPricing;
}

/**
 * Supported OpenRouter models with pricing data.
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
    throw new Error(`Unknown model: ${id}`);
  }
  return found;
}

/**
 * Look up a model definition by its identifier, returning `undefined` if not found.
 *
 * Unlike {@link model}, this does not throw for unknown IDs — useful when
 * the caller can gracefully handle missing pricing (e.g. non-OpenRouter models).
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
  return match(filter)
    .with(P.nullish, () => MODELS)
    .otherwise((fn) => MODELS.filter(fn));
}
