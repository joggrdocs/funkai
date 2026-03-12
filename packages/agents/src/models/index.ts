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

import { match } from "ts-pattern";

import { MODELS as GENERATED_MODELS } from "./providers/index.js";

/**
 * Supported OpenRouter model identifiers, derived from the generated {@link MODELS} array.
 */
export type OpenRouterLanguageModelId = (typeof GENERATED_MODELS)[number]["id"];

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
export function model(id: OpenRouterLanguageModelId): ModelDefinition {
  const found = MODELS.find((m) => m.id === id);
  if (!found) {
    throw new Error(`Unknown model: ${id}`);
  }
  return found;
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
    .when(
      (f): f is (m: ModelDefinition) => boolean => f != null,
      (f) => MODELS.filter(f),
    )
    .otherwise(() => MODELS);
}
