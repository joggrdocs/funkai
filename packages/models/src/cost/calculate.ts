import type { UsageCost } from "./types.js";
import type { ModelPricing } from "@/catalog/types.js";
import type { TokenUsage } from "@/provider/types.js";

/**
 * Calculate the dollar cost from token usage and model pricing.
 *
 * Multiplies each token count by the corresponding per-token pricing rate.
 * Optional pricing fields (cache) default to `0` when absent.
 *
 * @param usage - Token counts from a model invocation.
 * @param pricing - Per-token pricing rates for the model.
 * @returns A {@link UsageCost} with per-field and total costs in USD.
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
 * const m = model('gpt-4.1')
 * if (m) {
 *   const cost = calculateCost(usage, m.pricing)
 *   console.log(cost.total) // 0.006
 * }
 * ```
 */
export function calculateCost(usage: TokenUsage, pricing: ModelPricing): UsageCost {
  const input = usage.inputTokens * pricing.input;
  const output = usage.outputTokens * pricing.output;
  const cacheRead = usage.cacheReadTokens * (pricing.cacheRead ?? 0);
  const cacheWrite = usage.cacheWriteTokens * (pricing.cacheWrite ?? 0);
  const total = input + output + cacheRead + cacheWrite;

  return { input, output, cacheRead, cacheWrite, total };
}
