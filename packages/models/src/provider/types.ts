import { type LanguageModel as BaseLanguageModel } from "ai";

/**
 * AI SDK v3 language model type.
 *
 * Narrowed to the v3 specification version for type safety.
 * All models created via `openrouter()` or direct AI SDK providers satisfy this type.
 */
export type LanguageModel = Extract<BaseLanguageModel, { specificationVersion: "v3" }>;

/**
 * Base token counts shared by raw tracking records and final output.
 *
 * All fields are resolved `number` (0 when absent).
 */
export interface TokenUsage {
  /** Number of input (prompt) tokens. */
  readonly inputTokens: number;

  /** Number of output (completion) tokens. */
  readonly outputTokens: number;

  /** Total tokens (input + output). */
  readonly totalTokens: number;

  /** Tokens served from the provider's prompt cache. */
  readonly cacheReadTokens: number;

  /** Tokens written into the provider's prompt cache. */
  readonly cacheWriteTokens: number;

  /** Tokens consumed by the model's internal reasoning (e.g. o3/o4). */
  readonly reasoningTokens: number;
}
