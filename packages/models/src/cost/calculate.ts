import type { LanguageModelUsage } from "ai";

import type { UsageCost } from "./types.js";
import type { ModelPricing } from "@/catalog/types.js";

/**
 * Calculate the dollar cost from token usage and model pricing.
 *
 * Reads token counts from the AI SDK's {@link LanguageModelUsage} type,
 * extracting nested detail fields for cache and reasoning tokens.
 * Optional pricing fields (cache, reasoning) default to `0` when absent.
 *
 * **Reasoning token semantics**: `outputTokenDetails.reasoningTokens` are
 * expected to be **exclusive** of `outputTokens` — they are billed separately.
 * If your provider includes reasoning tokens _within_ the `outputTokens` count,
 * you must deduct them before passing usage to this function to avoid
 * double-counting output costs.
 *
 * @param usage - Token counts from a model invocation (AI SDK `LanguageModelUsage`).
 * @param pricing - Per-token pricing rates for the model.
 * @returns A {@link UsageCost} with per-field and total costs in USD.
 *
 * @example
 * ```typescript
 * import { calculateCost, model } from '@funkai/models'
 * import type { LanguageModelUsage } from 'ai'
 *
 * const usage: LanguageModelUsage = {
 *   inputTokens: 1000,
 *   outputTokens: 500,
 *   totalTokens: 1500,
 *   inputTokenDetails: { noCacheTokens: 800, cacheReadTokens: 200, cacheWriteTokens: undefined },
 *   outputTokenDetails: { textTokens: 500, reasoningTokens: undefined },
 * }
 * const m = model('gpt-4.1')
 * if (m) {
 *   const cost = calculateCost(usage, m.pricing)
 *   console.log(cost.total) // 0.006
 * }
 * ```
 */
export function calculateCost(usage: LanguageModelUsage, pricing: ModelPricing): UsageCost {
  const input = (usage.inputTokens ?? 0) * pricing.input;
  const output = (usage.outputTokens ?? 0) * pricing.output;
  const cacheRead = (usage.inputTokenDetails?.cacheReadTokens ?? 0) * (pricing.cacheRead ?? 0);
  const cacheWrite = (usage.inputTokenDetails?.cacheWriteTokens ?? 0) * (pricing.cacheWrite ?? 0);
  const reasoning =
    (usage.outputTokenDetails?.reasoningTokens ?? 0) * (pricing.reasoning ?? 0);
  const total = input + output + cacheRead + cacheWrite + reasoning;

  return { input, output, cacheRead, cacheWrite, reasoning, total };
}
