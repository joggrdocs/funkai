/**
 * Per-model pricing in USD per token.
 *
 * All rates are per-token. The generation script converts models.dev
 * per-million-token rates at code-gen time so runtime {@link calculateCost}
 * can multiply directly.
 */
export interface ModelPricing {
  /** Cost per input token. */
  readonly input: number;

  /** Cost per output token. */
  readonly output: number;

  /** Cost per cached input token (read). */
  readonly cacheRead?: number;

  /** Cost per cached input token (write). */
  readonly cacheWrite?: number;
}

/**
 * Model input/output modality descriptors.
 *
 * Values come directly from the models.dev API (e.g. `"text"`,
 * `"image"`, `"audio"`, `"video"`, `"pdf"`).
 */
export interface ModelModalities {
  /** Accepted input modalities. */
  readonly input: readonly string[];

  /** Produced output modalities. */
  readonly output: readonly string[];
}

/**
 * Boolean capability flags for a model.
 */
export interface ModelCapabilities {
  /** Supports chain-of-thought / extended thinking. */
  readonly reasoning: boolean;

  /** Supports tool (function) calling. */
  readonly toolCall: boolean;

  /** Supports file/image attachments. */
  readonly attachment: boolean;

  /** Supports structured (JSON) output. */
  readonly structuredOutput: boolean;
}

/**
 * Model definition with metadata, pricing, and capabilities.
 */
export interface ModelDefinition {
  /** Provider-native model identifier (e.g. `"gpt-4.1"`, `"claude-sonnet-4"`). */
  readonly id: string;

  /** Human-readable display name (e.g. `"GPT-4.1"`). */
  readonly name: string;

  /** Provider slug matching the key in `providers.json` (e.g. `"openai"`). */
  readonly provider: string;

  /** Model family (e.g. `"gpt"`, `"claude-sonnet"`). */
  readonly family: string;

  /** Token pricing rates (per-token, converted from per-million at generation time). */
  readonly pricing: ModelPricing;

  /** Maximum context window size in tokens. */
  readonly contextWindow: number;

  /** Maximum output tokens. */
  readonly maxOutput: number;

  /** Supported input/output modalities. */
  readonly modalities: ModelModalities;

  /** Model capability flags. */
  readonly capabilities: ModelCapabilities;
}
