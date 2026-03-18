import { describe, expect, it } from "vitest";

import type { TokenUsage, TokenUsageRecord } from "@/core/provider/types.js";
import { usage, sumTokenUsage } from "@/core/provider/usage.js";

function createRecord(overrides?: Partial<TokenUsageRecord>): TokenUsageRecord {
  return {
    modelId: "openai/gpt-5.2-codex",
    inputTokens: undefined,
    outputTokens: undefined,
    totalTokens: undefined,
    cacheReadTokens: undefined,
    cacheWriteTokens: undefined,
    reasoningTokens: undefined,
    ...overrides,
  };
}

describe("usage()", () => {
  it("returns zero counts for a record with all undefined fields", () => {
    const result = usage(createRecord({ source: { agentId: "agent-1", scope: [] } }));

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      source: { type: "agent", agentId: "agent-1" },
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    });
  });

  it("passes through defined token counts from a single record", () => {
    const record = createRecord({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 10,
      cacheWriteTokens: 5,
      reasoningTokens: 20,
      source: { agentId: "agent-2", scope: [] },
    });

    const result = usage(record);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "agent", agentId: "agent-2" });
    expect(result[0]!.inputTokens).toBe(100);
    expect(result[0]!.outputTokens).toBe(50);
    expect(result[0]!.totalTokens).toBe(150);
    expect(result[0]!.cacheReadTokens).toBe(10);
    expect(result[0]!.cacheWriteTokens).toBe(5);
    expect(result[0]!.reasoningTokens).toBe(20);
  });

  it("accepts a single record (not wrapped in array)", () => {
    const record = createRecord({
      inputTokens: 42,
      source: { agentId: "agent-single", scope: [] },
    });

    const result = usage(record);

    expect(result).toHaveLength(1);
    expect(result[0]!.inputTokens).toBe(42);
  });

  it("aggregates token counts across multiple records from the same agent", () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        source: { agentId: "agent-multi", scope: [] },
      }),
      createRecord({
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
        source: { agentId: "agent-multi", scope: [] },
      }),
      createRecord({
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
        source: { agentId: "agent-multi", scope: [] },
      }),
    ];

    const result = usage(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.inputTokens).toBe(350);
    expect(result[0]!.outputTokens).toBe(175);
    expect(result[0]!.totalTokens).toBe(525);
  });

  it("treats undefined fields as 0 during aggregation", () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 100,
        cacheReadTokens: undefined,
        source: { agentId: "agent-mixed", scope: [] },
      }),
      createRecord({
        inputTokens: undefined,
        cacheReadTokens: 30,
        source: { agentId: "agent-mixed", scope: [] },
      }),
    ];

    const result = usage(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.inputTokens).toBe(100);
    expect(result[0]!.cacheReadTokens).toBe(30);
  });

  it("returns empty array for empty records", () => {
    const result = usage([]);

    expect(result).toEqual([]);
  });

  it("groups records by source.agentId", () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        source: { agentId: "agent-a", scope: [] },
      }),
      createRecord({
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
        source: { agentId: "agent-b", scope: [] },
      }),
      createRecord({
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
        source: { agentId: "agent-a", scope: [] },
      }),
    ];

    const result = usage(records);

    expect(result).toHaveLength(2);

    const agentA = result.find((u) => u.source.type === "agent" && u.source.agentId === "agent-a");
    expect(agentA).toBeDefined();
    expect(agentA!.inputTokens).toBe(150);
    expect(agentA!.outputTokens).toBe(75);
    expect(agentA!.totalTokens).toBe(225);

    const agentB = result.find((u) => u.source.type === "agent" && u.source.agentId === "agent-b");
    expect(agentB).toBeDefined();
    expect(agentB!.inputTokens).toBe(200);
    expect(agentB!.outputTokens).toBe(100);
    expect(agentB!.totalTokens).toBe(300);
  });

  it("assigns records without source to unattributed", () => {
    const records: TokenUsageRecord[] = [
      createRecord({ inputTokens: 100 }),
      createRecord({ inputTokens: 50 }),
    ];

    const result = usage(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "unattributed" });
    expect(result[0]!.inputTokens).toBe(150);
  });

  it("assigns records with source but no agentId to unattributed", () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 75,
        source: { agentId: undefined as unknown as string, scope: [] },
      }),
    ];

    const result = usage(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "unattributed" });
  });

  it("groups records from different steps under the same agentId", () => {
    const records: TokenUsageRecord[] = [
      createRecord({
        inputTokens: 10,
        source: { agentId: "agent-x", workflowId: "wf-1", stepId: "step-1", scope: ["a"] },
      }),
      createRecord({
        inputTokens: 20,
        source: { agentId: "agent-x", workflowId: "wf-1", stepId: "step-2", scope: ["b"] },
      }),
    ];

    const result = usage(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "agent", agentId: "agent-x" });
    expect(result[0]!.inputTokens).toBe(30);
  });
});

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
};

function createUsage(overrides?: Partial<TokenUsage>): TokenUsage {
  return { ...ZERO_USAGE, ...overrides };
}

describe("sumTokenUsage()", () => {
  it("sums all fields across multiple usage objects", () => {
    const usages = [
      createUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }),
      createUsage({ inputTokens: 200, outputTokens: 100, totalTokens: 300 }),
    ];

    const result = sumTokenUsage(usages);

    expect(result.inputTokens).toBe(300);
    expect(result.outputTokens).toBe(150);
    expect(result.totalTokens).toBe(450);
  });

  it("sums cache and reasoning token fields", () => {
    const usages = [
      createUsage({ cacheReadTokens: 10, cacheWriteTokens: 5, reasoningTokens: 20 }),
      createUsage({ cacheReadTokens: 30, cacheWriteTokens: 15, reasoningTokens: 40 }),
    ];

    const result = sumTokenUsage(usages);

    expect(result.cacheReadTokens).toBe(40);
    expect(result.cacheWriteTokens).toBe(20);
    expect(result.reasoningTokens).toBe(60);
  });

  it("returns zero usage for an empty array", () => {
    const result = sumTokenUsage([]);

    expect(result).toEqual(ZERO_USAGE);
  });

  it("returns the same values for a single-element array", () => {
    const u = createUsage({ inputTokens: 42, outputTokens: 21, totalTokens: 63 });

    const result = sumTokenUsage([u]);

    expect(result).toEqual(u);
  });

  it("sums three or more usage objects", () => {
    const usages = [
      createUsage({ inputTokens: 100 }),
      createUsage({ inputTokens: 200 }),
      createUsage({ inputTokens: 50 }),
    ];

    const result = sumTokenUsage(usages);

    expect(result.inputTokens).toBe(350);
  });

  it("does not mutate any input", () => {
    const a = createUsage({ inputTokens: 100 });
    const b = createUsage({ inputTokens: 200 });
    const aCopy = { ...a };
    const bCopy = { ...b };

    sumTokenUsage([a, b]);

    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });
});
