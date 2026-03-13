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
  readonly prompt: number;

  /** Cost per output (completion) token. */
  readonly completion: number;

  /** Cost per cached input token (read). */
  readonly inputCacheRead?: number;

  /** Cost per cached input token (write). */
  readonly inputCacheWrite?: number;

  /** Cost per web search request. */
  readonly webSearch?: number;

  /** Cost per internal reasoning token. */
  readonly internalReasoning?: number;

  /** Cost per image input token. */
  readonly image?: number;

  /** Cost per audio input second. */
  readonly audio?: number;

  /** Cost per audio output second. */
  readonly audioOutput?: number;
}

/**
 * Model definition with metadata and pricing.
 */
export interface ModelDefinition {
  /** Model identifier (e.g. `"openai/gpt-5.2-codex"`). */
  readonly id: string;

  /** Model category for classification. */
  readonly category: ModelCategory;

  /** Token pricing rates. */
  readonly pricing: ModelPricing;
}
