import { describe, expect, it } from "vitest";

import { calculateCost } from "./calculate.js";
import type { ModelPricing } from "@/catalog/types.js";
import type { TokenUsage } from "@/provider/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
};

const BASIC_PRICING: ModelPricing = {
  prompt: 0.000002,
  completion: 0.000008,
};

const FULL_PRICING: ModelPricing = {
  prompt: 0.000002,
  completion: 0.000008,
  inputCacheRead: 0.0000005,
  inputCacheWrite: 0.000001,
  internalReasoning: 0.000004,
};

// ---------------------------------------------------------------------------
// calculateCost()
// ---------------------------------------------------------------------------

describe("calculateCost()", () => {
  it("returns all zeros for zero usage", () => {
    const result = calculateCost(ZERO_USAGE, FULL_PRICING);

    expect(result.prompt).toBe(0);
    expect(result.completion).toBe(0);
    expect(result.cacheRead).toBe(0);
    expect(result.cacheWrite).toBe(0);
    expect(result.reasoning).toBe(0);
    expect(result.total).toBe(0);
  });

  it("calculates prompt and completion costs", () => {
    const usage: TokenUsage = {
      ...ZERO_USAGE,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    };

    const result = calculateCost(usage, BASIC_PRICING);

    expect(result.prompt).toBeCloseTo(0.002);
    expect(result.completion).toBeCloseTo(0.004);
    expect(result.total).toBeCloseTo(0.006);
  });

  it("handles pricing without optional fields", () => {
    const usage: TokenUsage = {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      cacheReadTokens: 200,
      cacheWriteTokens: 100,
      reasoningTokens: 50,
    };

    const result = calculateCost(usage, BASIC_PRICING);

    // Optional pricing fields default to 0, so cache and reasoning cost nothing
    expect(result.cacheRead).toBe(0);
    expect(result.cacheWrite).toBe(0);
    expect(result.reasoning).toBe(0);
    expect(result.total).toBeCloseTo(0.006);
  });

  it("calculates full cost breakdown with all pricing fields", () => {
    const usage: TokenUsage = {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      cacheReadTokens: 200,
      cacheWriteTokens: 100,
      reasoningTokens: 300,
    };

    const result = calculateCost(usage, FULL_PRICING);

    expect(result.prompt).toBeCloseTo(0.002);
    expect(result.completion).toBeCloseTo(0.004);
    expect(result.cacheRead).toBeCloseTo(0.0001);
    expect(result.cacheWrite).toBeCloseTo(0.0001);
    expect(result.reasoning).toBeCloseTo(0.0012);
    expect(result.total).toBeCloseTo(0.0074);
  });

  it("total equals sum of all fields", () => {
    const usage: TokenUsage = {
      inputTokens: 500,
      outputTokens: 250,
      totalTokens: 750,
      cacheReadTokens: 100,
      cacheWriteTokens: 50,
      reasoningTokens: 150,
    };

    const result = calculateCost(usage, FULL_PRICING);
    const expectedTotal =
      result.prompt + result.completion + result.cacheRead + result.cacheWrite + result.reasoning;

    expect(result.total).toBeCloseTo(expectedTotal);
  });
});
