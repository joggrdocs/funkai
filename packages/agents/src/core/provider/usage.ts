import type { LanguageModelUsage } from "ai";
import { groupBy, isNotNil, isString, sumBy } from "es-toolkit";

import type { TokenUsageRecord } from "@/core/provider/types.js";

/**
 * Source identifying a specific agent.
 */
export interface AgentSource {
  readonly type: "agent";
  readonly agentId: string;
}

/**
 * Source for usage records that lack an agent attribution.
 */
export interface UnattributedSource {
  readonly type: "unattributed";
}

/**
 * Per-agent usage — token counts with agent source identity.
 */
export interface AgentTokenUsage extends LanguageModelUsage {
  /**
   * Which agent (or unattributed source) produced this usage.
   */
  readonly source: AgentSource | UnattributedSource;
}

/**
 * Per-model usage — token counts with model identity.
 */
export interface ModelTokenUsage extends LanguageModelUsage {
  /**
   * The model that produced this usage (e.g. `"openai/gpt-5.2-codex"`).
   */
  readonly modelId: string;
}

/**
 * Sum all token usage records into a single {@link LanguageModelUsage}.
 *
 * Treats `undefined` fields as `0`. Returns zero-valued usage for
 * an empty array.
 *
 * @param records - Raw tracking records from agent execution(s).
 * @returns A single `LanguageModelUsage` with each field summed.
 *
 * @example
 * ```typescript
 * const records = collectUsages(result.trace)
 * const total = usage(records)
 * // { inputTokens: 350, outputTokens: 175, ... }
 * ```
 */
export function usage(records: readonly LanguageModelUsage[]): LanguageModelUsage {
  return aggregateTokens(records);
}

/**
 * Compute per-agent token usage from raw tracking records.
 *
 * Groups records by `source.agentId`, aggregates token counts per group,
 * and returns a flat array of per-agent usage. Records without a
 * `source.agentId` are grouped as `{ type: 'unattributed' }`.
 *
 * @param records - Raw tracking records from agent execution(s).
 * @returns Per-agent usage breakdown.
 *
 * @example
 * ```typescript
 * const records = collectUsages(result.trace)
 * const perAgent = usageByAgent(records)
 * // [{ source: { type: 'agent', agentId: 'scanner' }, inputTokens: 150, ... }]
 * ```
 */
export function usageByAgent(records: TokenUsageRecord[]): readonly AgentTokenUsage[] {
  const UNATTRIBUTED = "__unattributed__";

  const grouped = groupBy(records, (r) => {
    const agentId = extractAgentId(r.source);
    if (isString(agentId)) {
      return agentId;
    }
    return UNATTRIBUTED;
  });

  return Object.entries(grouped).map(([key, group]) => {
    const source: AgentSource | UnattributedSource = resolveSource(key, UNATTRIBUTED);
    // oxlint-disable-next-line unicorn/prefer-object-spread -- no-map-spread rule requires Object.assign
    return Object.assign({ source }, aggregateTokens(group));
  });
}

/**
 * Compute per-model token usage from raw tracking records.
 *
 * Groups records by `modelId`, aggregates token counts per group,
 * and returns a flat array of per-model usage.
 *
 * @param records - Raw tracking records from agent execution(s).
 * @returns Per-model usage breakdown.
 *
 * @example
 * ```typescript
 * const records = collectUsages(result.trace)
 * const perModel = usageByModel(records)
 * // [{ modelId: 'openai/gpt-5.2-codex', inputTokens: 350, ... }]
 * ```
 */
export function usageByModel(records: TokenUsageRecord[]): readonly ModelTokenUsage[] {
  const grouped = groupBy(records, (r) => r.modelId);

  return Object.entries(grouped).map(
    // oxlint-disable-next-line prefer-object-spread -- no-map-spread conflicts with prefer-object-spread
    ([modelId, group]) => Object.assign({ modelId }, aggregateTokens(group)),
  );
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Aggregate token counts across multiple raw tracking records.
 *
 * Sums each field (including nested details), treating `undefined` as `0`.
 *
 * @private
 */
function aggregateTokens(usages: readonly LanguageModelUsage[]): LanguageModelUsage {
  const sumOptional = (fn: (u: LanguageModelUsage) => number | undefined): number | undefined => {
    const total = usages.reduce((acc, u) => acc + (fn(u) ?? 0), 0);
    if (total > 0) {
      return total;
    }
    return undefined;
  };
  return {
    inputTokens: sumBy(usages, (u) => u.inputTokens ?? 0),
    outputTokens: sumBy(usages, (u) => u.outputTokens ?? 0),
    totalTokens: sumBy(usages, (u) => u.totalTokens ?? 0),
    inputTokenDetails: {
      noCacheTokens: sumOptional((u) => u.inputTokenDetails?.noCacheTokens),
      cacheReadTokens: sumOptional((u) => u.inputTokenDetails?.cacheReadTokens),
      cacheWriteTokens: sumOptional((u) => u.inputTokenDetails?.cacheWriteTokens),
    },
    outputTokenDetails: {
      textTokens: sumOptional((u) => u.outputTokenDetails?.textTokens),
      reasoningTokens: sumOptional((u) => u.outputTokenDetails?.reasoningTokens),
    },
  };
}

/**
 * Extract the agent ID from a usage record source, if present.
 *
 * @private
 */
function extractAgentId(source: TokenUsageRecord["source"]): string | undefined {
  if (isNotNil(source)) {
    return source.agentId;
  }
  return undefined;
}

/**
 * Resolve a grouping key into a typed agent or unattributed source.
 *
 * @private
 */
function resolveSource(key: string, unattributedKey: string): AgentSource | UnattributedSource {
  if (key === unattributedKey) {
    return { type: "unattributed" } as const;
  }
  return { type: "agent", agentId: key } as const;
}
