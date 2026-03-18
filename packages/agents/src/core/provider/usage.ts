import { groupBy, sumBy } from "es-toolkit";

import type { TokenUsage, TokenUsageRecord } from "@/core/provider/types.js";

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
 * Resolved usage for a single agent — token counts with source identity.
 */
export interface ResolvedUsage extends TokenUsage {
  /** Which agent (or unattributed source) produced this usage. */
  readonly source: AgentSource | UnattributedSource;
}

/**
 * Compute per-agent token usage from raw tracking records.
 *
 * Groups records by `source.agentId`, aggregates token counts per group,
 * and returns a flat array of per-agent usage. Records without a
 * `source.agentId` are grouped as `{ type: 'unattributed' }`.
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
 * // [{ source: { type: 'agent', agentId: 'scanner' }, inputTokens: 150, ... }]
 * ```
 */
export function usage(records: TokenUsageRecord | TokenUsageRecord[]): readonly ResolvedUsage[] {
  let arr: TokenUsageRecord[];
  // oxlint-disable-next-line unicorn/prefer-ternary -- no-ternary rule forbids ternaries
  if (Array.isArray(records)) {
    arr = records;
  } else {
    arr = [records];
  }

  const UNATTRIBUTED = "__unattributed__";

  const grouped = groupBy(arr, (r) => {
    let agentId: string | undefined;
    if (r.source !== null && r.source !== undefined) {
      ({ agentId } = r.source);
    }
    if (typeof agentId === "string") {
      return agentId;
    }
    return UNATTRIBUTED;
  });

  return Object.entries(grouped).map(([key, group]) => {
    let source: AgentSource | UnattributedSource;
    // oxlint-disable-next-line unicorn/prefer-ternary -- no-ternary rule forbids ternaries
    if (key === UNATTRIBUTED) {
      source = { type: "unattributed" } as const;
    } else {
      source = { type: "agent", agentId: key } as const;
    }
    // oxlint-disable-next-line unicorn/prefer-object-spread -- no-map-spread rule requires Object.assign
    return Object.assign({ source }, aggregateTokens(group));
  });
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
