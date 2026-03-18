import { groupBy, sumBy } from "es-toolkit";

import type { TokenUsage, TokenUsageRecord } from "@/core/provider/types.js";

/**
 * Resolved usage for a single agent — token counts with source identity.
 */
export interface ResolvedUsage extends TokenUsage {
  /** Which agent produced this usage. */
  readonly source: {
    readonly agentId: string;
  };
}

/**
 * Compute per-agent token usage from raw tracking records.
 *
 * Groups records by `source.agentId`, aggregates token counts per group,
 * and returns a flat array of per-agent usage. Records without a
 * `source.agentId` are grouped under `"unknown"`.
 *
 * Works for both single-agent and multi-agent (flow) scenarios — a single
 * agent's records simply produce a one-element array.
 *
 * @param records - Raw tracking records from agent execution(s).
 * @returns Per-agent usage breakdown.
 *
 * @example
 * ```typescript
 * const records = collectUsages(result.trace)
 * const perAgent = usage(records)
 * // [{ source: { agentId: 'scanner' }, inputTokens: 150, ... }]
 * ```
 */
export function usage(records: TokenUsageRecord | TokenUsageRecord[]): readonly ResolvedUsage[] {
  const arr = Array.isArray(records) ? records : [records];

  const grouped = groupBy(arr, (r) => {
    const agentId = r.source?.agentId;
    return typeof agentId === "string" ? agentId : "unknown";
  });

  return Object.entries(grouped).map(([agentId, group]) => ({
    source: { agentId },
    ...aggregateTokens(group),
  }));
}

/**
 * Sum multiple {@link TokenUsage} objects field-by-field.
 *
 * Pure function — returns a new object without mutating any input.
 * Returns zero-valued usage when given an empty array.
 *
 * @param usages - Array of usage objects to sum.
 * @returns A new `TokenUsage` with each field summed.
 */
export function sumTokenUsage(usages: TokenUsage[]): TokenUsage {
  return {
    inputTokens: sumBy(usages, (u) => u.inputTokens),
    outputTokens: sumBy(usages, (u) => u.outputTokens),
    totalTokens: sumBy(usages, (u) => u.totalTokens),
    cacheReadTokens: sumBy(usages, (u) => u.cacheReadTokens),
    cacheWriteTokens: sumBy(usages, (u) => u.cacheWriteTokens),
    reasoningTokens: sumBy(usages, (u) => u.reasoningTokens),
  };
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Aggregate token counts across multiple raw tracking records.
 *
 * Sums each field, treating `undefined` as `0`.
 *
 * @private
 */
function aggregateTokens(usages: TokenUsageRecord[]): TokenUsage {
  return {
    inputTokens: sumBy(usages, (u) => u.inputTokens ?? 0),
    outputTokens: sumBy(usages, (u) => u.outputTokens ?? 0),
    totalTokens: sumBy(usages, (u) => u.totalTokens ?? 0),
    cacheReadTokens: sumBy(usages, (u) => u.cacheReadTokens ?? 0),
    cacheWriteTokens: sumBy(usages, (u) => u.cacheWriteTokens ?? 0),
    reasoningTokens: sumBy(usages, (u) => u.reasoningTokens ?? 0),
  };
}
