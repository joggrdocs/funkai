import type { ModelId } from "@funkai/models";
import type { TokenUsage } from "@funkai/models";

export type { LanguageModel, TokenUsage } from "@funkai/models";

/**
 * Raw tracking record from a single AI model invocation.
 *
 * Fields are `number | undefined` because providers may not report all fields.
 * Carries `modelId` so that consumers can look up pricing if needed.
 */
export interface TokenUsageRecord {
  /**
   * The model identifier that produced this usage
   * (e.g. `"openai/gpt-5.2-codex"`).
   */
  readonly modelId: ModelId;

  /** Number of input (prompt) tokens. */
  readonly inputTokens: number | undefined;

  /** Number of output (completion) tokens. */
  readonly outputTokens: number | undefined;

  /** Total tokens (input + output). */
  readonly totalTokens: number | undefined;

  /** Tokens served from the provider's prompt cache. */
  readonly cacheReadTokens: number | undefined;

  /** Tokens written into the provider's prompt cache. */
  readonly cacheWriteTokens: number | undefined;

  /** Tokens consumed by the model's internal reasoning (e.g. o3/o4). */
  readonly reasoningTokens: number | undefined;

  /**
   * Populated by the framework — identifies which component produced this usage.
   */
  readonly source?: {
    readonly workflowId?: string;
    readonly stepId?: string;
    readonly agentId: string;
    readonly scope: readonly string[];
  };
}
