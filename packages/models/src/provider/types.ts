import type { LanguageModel as BaseLanguageModel } from "ai";

/**
 * AI SDK language model instance (v3 specification).
 *
 * Narrowed from the base `LanguageModel` union (which includes `string`) to
 * only concrete v3 model objects. This is required because AI SDK functions
 * like `wrapLanguageModel` expect `LanguageModelV3` specifically.
 *
 * When the AI SDK introduces a new specification version, update the
 * `specificationVersion` literal here and verify compatibility with
 * downstream consumers (e.g. `@funkai/agents` middleware).
 */
export type LanguageModel = Extract<BaseLanguageModel, { specificationVersion: "v3" }>;

/**
 * Base token counts shared by raw tracking records and final output.
 *
 * All fields are resolved `number` (0 when absent).
 *
 * **Reasoning token semantics**: `reasoningTokens` must be **exclusive** of
 * `outputTokens`. Some providers include reasoning tokens inside the output
 * token count — if so, callers must deduct reasoning tokens from
 * `outputTokens` before constructing this type to avoid double-counting in
 * cost calculations.
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
