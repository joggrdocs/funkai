import type { CostBreakdown } from "./types.js";
import type { ModelPricing } from "@/catalog/types.js";
import type { TokenUsage } from "@/provider/types.js";

/**
 * Calculate the dollar cost from token usage and model pricing.
 *
 * Multiplies each token count by the corresponding per-token pricing rate.
 * Optional pricing fields (cache, reasoning) default to `0` when absent.
 *
 * @param usage - Token counts from a model invocation.
 * @param pricing - Per-token pricing rates for the model.
 * @returns A {@link CostBreakdown} with per-field and total costs in USD.
 *
 * @example
 * ```typescript
 * import { calculateCost, model } from '@funkai/models'
 *
 * const usage: TokenUsage = {
 *   inputTokens: 1000,
 *   outputTokens: 500,
 *   totalTokens: 1500,
 *   cacheReadTokens: 200,
 *   cacheWriteTokens: 0,
 *   reasoningTokens: 0,
 * }
 * const m = model('openai/gpt-4.1')
 * const cost = calculateCost(usage, m.pricing)
 * console.log(cost.total) // 0.006
 * ```
 */
export function calculateCost(usage: TokenUsage, pricing: ModelPricing): CostBreakdown {
  const prompt = usage.inputTokens * pricing.prompt;
  const completion = usage.outputTokens * pricing.completion;
  const cacheRead = usage.cacheReadTokens * (pricing.inputCacheRead ?? 0);
  const cacheWrite = usage.cacheWriteTokens * (pricing.inputCacheWrite ?? 0);
  const reasoning = usage.reasoningTokens * (pricing.internalReasoning ?? 0);
  const total = prompt + completion + cacheRead + cacheWrite + reasoning;

  return { prompt, completion, cacheRead, cacheWrite, reasoning, total };
}
