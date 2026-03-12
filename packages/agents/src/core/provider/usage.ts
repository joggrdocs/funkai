import { groupBy, sumBy } from 'es-toolkit'
import { match, P } from 'ts-pattern'

import type {
  TokenUsage,
  TokenUsageRecord,
  AgentTokenUsage,
  FlowAgentTokenUsage,
} from '@/core/provider/types.js'

/**
 * Aggregate token counts across multiple raw tracking records.
 *
 * Sums each field, treating `undefined` as `0`.
 */
function aggregateTokens(usages: TokenUsageRecord[]): TokenUsage {
  return {
    inputTokens: sumBy(usages, (u) => u.inputTokens ?? 0),
    outputTokens: sumBy(usages, (u) => u.outputTokens ?? 0),
    totalTokens: sumBy(usages, (u) => u.totalTokens ?? 0),
    cacheReadTokens: sumBy(usages, (u) => u.cacheReadTokens ?? 0),
    cacheWriteTokens: sumBy(usages, (u) => u.cacheWriteTokens ?? 0),
    reasoningTokens: sumBy(usages, (u) => u.reasoningTokens ?? 0),
  }
}

/**
 * Compute final usage for a single agent call.
 *
 * Aggregates token counts from one or more raw tracking records.
 * Returns a flat object with tokens + agentId.
 *
 * @param agentId - The agent that produced these records.
 * @param records - Raw tracking records from the agent's execution.
 * @returns Flat {@link AgentTokenUsage} with resolved token counts.
 */
export function agentUsage(
  agentId: string,
  records: TokenUsageRecord | TokenUsageRecord[]
): AgentTokenUsage {
  const arr = match(records)
    .when(Array.isArray, (r) => r)
    .otherwise((r) => [r])
  const tokens = aggregateTokens(arr)

  return {
    agentId,
    ...tokens,
  }
}

/**
 * Compute final usage for a flow agent with multiple agent calls.
 *
 * Groups raw tracking records by `source.agentId`, computes per-agent
 * usage via {@link agentUsage}.
 *
 * @param records - Raw tracking records from all agents in the flow.
 * @returns {@link FlowAgentTokenUsage} with per-agent breakdown.
 */
export function flowAgentUsage(records: TokenUsageRecord[]): FlowAgentTokenUsage {
  const grouped = groupBy(records, (r) =>
    match(r.source)
      .with(P.nonNullable, (s) =>
        match(s.agentId)
          .with(P.string, (id) => id)
          .otherwise(() => 'unknown')
      )
      .otherwise(() => 'unknown')
  )

  const usages = Object.entries(grouped).map(([id, group]) => agentUsage(id, group))

  return {
    usages,
  }
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
  }
}
