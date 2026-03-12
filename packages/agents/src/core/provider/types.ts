import { type LanguageModel as BaseLanguageModel } from "ai";

import type { ModelId } from "@/core/models/index.js";

/**
 * AI SDK v3 language model type.
 *
 * Narrowed to the v3 specification version for type safety.
 * All models created via `openrouter()` or `wrapModel()` satisfy this type.
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

/**
 * Final agent-level usage — tokens flat, with agentId.
 *
 * Produced by `agentUsage()` at the end of an agent's execution.
 */
export interface AgentTokenUsage extends TokenUsage {
  /** The agent that produced this usage. */
  readonly agentId: string;
}

/**
 * Final flow agent-level usage — per-agent breakdown.
 *
 * Produced by `flowAgentUsage()` at the end of a flow agent's execution.
 */
export interface FlowAgentTokenUsage {
  /** Per-agent usage entries. */
  readonly usages: readonly AgentTokenUsage[];
}
