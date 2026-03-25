import type { LanguageModelUsage } from "ai";
import { describe, expect, it } from "vitest";

import { calculateCost } from "./calculate.js";
import type { ModelPricing } from "@/catalog/types.js";

const ZERO_USAGE: LanguageModelUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  inputTokenDetails: {
    noCacheTokens: undefined,
    cacheReadTokens: undefined,
    cacheWriteTokens: undefined,
  },
  outputTokenDetails: {
    textTokens: undefined,
    reasoningTokens: undefined,
  },
};

const BASIC_PRICING: ModelPricing = {
  input: 0.000_002,
  output: 0.000_008,
};

const FULL_PRICING: ModelPricing = {
  input: 0.000_002,
  output: 0.000_008,
  cacheRead: 0.000_000_5,
  cacheWrite: 0.000_001,
};

const REASONING_PRICING: ModelPricing = {
  input: 0.000_002,
  output: 0.000_008,
  cacheRead: 0.000_000_5,
  cacheWrite: 0.000_001,
  reasoning: 0.000_012,
};

describe("calculateCost()", () => {
  it("returns all zeros for zero usage", () => {
    const result = calculateCost(ZERO_USAGE, FULL_PRICING);

    expect(result.input).toBe(0);
    expect(result.output).toBe(0);
    expect(result.cacheRead).toBe(0);
    expect(result.cacheWrite).toBe(0);
    expect(result.reasoning).toBe(0);
    expect(result.total).toBe(0);
  });

  it("calculates input and output costs", () => {
    const usage: LanguageModelUsage = {
      ...ZERO_USAGE,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    };

    const result = calculateCost(usage, BASIC_PRICING);

    expect(result.input).toBeCloseTo(0.002);
    expect(result.output).toBeCloseTo(0.004);
    expect(result.total).toBeCloseTo(0.006);
  });

  it("handles pricing without optional fields", () => {
    const usage: LanguageModelUsage = {
      ...ZERO_USAGE,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      inputTokenDetails: {
        noCacheTokens: 700,
        cacheReadTokens: 200,
        cacheWriteTokens: 100,
      },
      outputTokenDetails: {
        textTokens: 450,
        reasoningTokens: 50,
      },
    };

    const result = calculateCost(usage, BASIC_PRICING);

    // Optional pricing fields default to 0, so cache and reasoning cost nothing
    expect(result.cacheRead).toBe(0);
    expect(result.cacheWrite).toBe(0);
    expect(result.reasoning).toBe(0);
    expect(result.total).toBeCloseTo(0.005);
  });

  it("calculates full cost breakdown with all pricing fields", () => {
    const usage: LanguageModelUsage = {
      ...ZERO_USAGE,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      inputTokenDetails: {
        noCacheTokens: 700,
        cacheReadTokens: 200,
        cacheWriteTokens: 100,
      },
      outputTokenDetails: {
        textTokens: 200,
        reasoningTokens: 300,
      },
    };

    const result = calculateCost(usage, FULL_PRICING);

    expect(result.input).toBeCloseTo(0.0014);
    expect(result.output).toBeCloseTo(0.0016);
    expect(result.cacheRead).toBeCloseTo(0.0001);
    expect(result.cacheWrite).toBeCloseTo(0.0001);
    expect(result.total).toBeCloseTo(0.0032);
  });

  it("calculates reasoning token costs when pricing is provided", () => {
    const usage: LanguageModelUsage = {
      ...ZERO_USAGE,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      outputTokenDetails: {
        textTokens: 500,
        reasoningTokens: 800,
      },
    };

    const result = calculateCost(usage, REASONING_PRICING);

    expect(result.reasoning).toBeCloseTo(0.0096);
    expect(result.total).toBeCloseTo(0.002 + 0.004 + 0.0096);
  });

  it("defaults reasoning cost to zero when pricing omits reasoning", () => {
    const usage: LanguageModelUsage = {
      ...ZERO_USAGE,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      outputTokenDetails: {
        textTokens: 500,
        reasoningTokens: 800,
      },
    };

    const result = calculateCost(usage, BASIC_PRICING);

    expect(result.reasoning).toBe(0);
    expect(result.total).toBeCloseTo(0.006);
  });

  it("total equals sum of all fields", () => {
    const usage: LanguageModelUsage = {
      ...ZERO_USAGE,
      inputTokens: 500,
      outputTokens: 250,
      totalTokens: 750,
      inputTokenDetails: {
        noCacheTokens: 600,
        cacheReadTokens: 100,
        cacheWriteTokens: 50,
      },
      outputTokenDetails: {
        textTokens: 100,
        reasoningTokens: 150,
      },
    };

    const result = calculateCost(usage, FULL_PRICING);
    const expectedTotal =
      result.input + result.output + result.cacheRead + result.cacheWrite + result.reasoning;

    expect(result.total).toBeCloseTo(expectedTotal);
  });
});
