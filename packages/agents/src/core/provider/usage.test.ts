import { describe, expect, it } from "vitest";

import type { TokenUsageRecord } from "@/core/provider/types.js";
import { usage, usageByAgent, usageByModel } from "@/core/provider/usage.js";

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
  it("returns zero counts for empty array", () => {
    const result = usage([]);

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    });
  });

  it("sums all fields across multiple records", () => {
    const records = [
      createRecord({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }),
      createRecord({ inputTokens: 200, outputTokens: 100, totalTokens: 300 }),
    ];

    const result = usage(records);

    expect(result.inputTokens).toBe(300);
    expect(result.outputTokens).toBe(150);
    expect(result.totalTokens).toBe(450);
  });

  it("treats undefined fields as 0", () => {
    const records = [
      createRecord({ inputTokens: 100, cacheReadTokens: undefined }),
      createRecord({ inputTokens: undefined, cacheReadTokens: 30 }),
    ];

    const result = usage(records);

    expect(result.inputTokens).toBe(100);
    expect(result.cacheReadTokens).toBe(30);
  });

  it("sums cache and reasoning token fields", () => {
    const records = [
      createRecord({ cacheReadTokens: 10, cacheWriteTokens: 5, reasoningTokens: 20 }),
      createRecord({ cacheReadTokens: 30, cacheWriteTokens: 15, reasoningTokens: 40 }),
    ];

    const result = usage(records);

    expect(result.cacheReadTokens).toBe(40);
    expect(result.cacheWriteTokens).toBe(20);
    expect(result.reasoningTokens).toBe(60);
  });

  it("returns exact values for a single record", () => {
    const records = [
      createRecord({
        inputTokens: 42,
        outputTokens: 21,
        totalTokens: 63,
        cacheReadTokens: 5,
        cacheWriteTokens: 3,
        reasoningTokens: 10,
      }),
    ];

    const result = usage(records);

    expect(result.inputTokens).toBe(42);
    expect(result.outputTokens).toBe(21);
    expect(result.totalTokens).toBe(63);
    expect(result.cacheReadTokens).toBe(5);
    expect(result.cacheWriteTokens).toBe(3);
    expect(result.reasoningTokens).toBe(10);
  });
});

describe("usageByAgent()", () => {
  it("returns empty array for empty records", () => {
    const result = usageByAgent([]);

    expect(result).toEqual([]);
  });

  it("returns zero counts for a record with all undefined fields", () => {
    const result = usageByAgent([createRecord({ source: { agentId: "agent-1", scope: [] } })]);

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
    const records = [
      createRecord({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cacheReadTokens: 10,
        cacheWriteTokens: 5,
        reasoningTokens: 20,
        source: { agentId: "agent-2", scope: [] },
      }),
    ];

    const result = usageByAgent(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "agent", agentId: "agent-2" });
    expect(result[0]!.inputTokens).toBe(100);
    expect(result[0]!.outputTokens).toBe(50);
    expect(result[0]!.totalTokens).toBe(150);
    expect(result[0]!.cacheReadTokens).toBe(10);
    expect(result[0]!.cacheWriteTokens).toBe(5);
    expect(result[0]!.reasoningTokens).toBe(20);
  });

  it("aggregates token counts across multiple records from the same agent", () => {
    const records = [
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

    const result = usageByAgent(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.inputTokens).toBe(350);
    expect(result[0]!.outputTokens).toBe(175);
    expect(result[0]!.totalTokens).toBe(525);
  });

  it("groups records by source.agentId", () => {
    const records = [
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

    const result = usageByAgent(records);

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
    const records = [createRecord({ inputTokens: 100 }), createRecord({ inputTokens: 50 })];

    const result = usageByAgent(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "unattributed" });
    expect(result[0]!.inputTokens).toBe(150);
  });

  it("assigns records with source but no agentId to unattributed", () => {
    const records = [
      createRecord({
        inputTokens: 75,
        source: { agentId: undefined as unknown as string, scope: [] },
      }),
    ];

    const result = usageByAgent(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "unattributed" });
  });

  it("groups records from different steps under the same agentId", () => {
    const records = [
      createRecord({
        inputTokens: 10,
        source: { agentId: "agent-x", workflowId: "wf-1", stepId: "step-1", scope: ["a"] },
      }),
      createRecord({
        inputTokens: 20,
        source: { agentId: "agent-x", workflowId: "wf-1", stepId: "step-2", scope: ["b"] },
      }),
    ];

    const result = usageByAgent(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toEqual({ type: "agent", agentId: "agent-x" });
    expect(result[0]!.inputTokens).toBe(30);
  });
});

describe("usageByModel()", () => {
  it("returns empty array for empty records", () => {
    const result = usageByModel([]);

    expect(result).toEqual([]);
  });

  it("returns usage for a single model", () => {
    const records = [
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }),
    ];

    const result = usageByModel(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.modelId).toBe("openai/gpt-5.2-codex");
    expect(result[0]!.inputTokens).toBe(100);
    expect(result[0]!.outputTokens).toBe(50);
    expect(result[0]!.totalTokens).toBe(150);
  });

  it("aggregates records from the same model", () => {
    const records = [
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }),
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
      }),
    ];

    const result = usageByModel(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.modelId).toBe("openai/gpt-5.2-codex");
    expect(result[0]!.inputTokens).toBe(300);
    expect(result[0]!.outputTokens).toBe(150);
    expect(result[0]!.totalTokens).toBe(450);
  });

  it("groups records by modelId", () => {
    const records = [
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }),
      createRecord({
        modelId: "anthropic/claude-opus-4-6",
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
      }),
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
      }),
    ];

    const result = usageByModel(records);

    expect(result).toHaveLength(2);

    const openai = result.find((u) => u.modelId === "openai/gpt-5.2-codex");
    expect(openai).toBeDefined();
    expect(openai!.inputTokens).toBe(150);
    expect(openai!.outputTokens).toBe(75);
    expect(openai!.totalTokens).toBe(225);

    const anthropic = result.find((u) => u.modelId === "anthropic/claude-opus-4-6");
    expect(anthropic).toBeDefined();
    expect(anthropic!.inputTokens).toBe(200);
    expect(anthropic!.outputTokens).toBe(100);
    expect(anthropic!.totalTokens).toBe(300);
  });

  it("treats undefined fields as 0", () => {
    const records = [
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: 100,
        cacheReadTokens: undefined,
      }),
      createRecord({
        modelId: "openai/gpt-5.2-codex",
        inputTokens: undefined,
        cacheReadTokens: 30,
      }),
    ];

    const result = usageByModel(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.inputTokens).toBe(100);
    expect(result[0]!.cacheReadTokens).toBe(30);
  });

  it("includes cache and reasoning fields per model", () => {
    const records = [
      createRecord({
        modelId: "openai/o4-mini",
        cacheReadTokens: 10,
        cacheWriteTokens: 5,
        reasoningTokens: 500,
      }),
      createRecord({
        modelId: "openai/o4-mini",
        cacheReadTokens: 20,
        cacheWriteTokens: 10,
        reasoningTokens: 300,
      }),
    ];

    const result = usageByModel(records);

    expect(result).toHaveLength(1);
    expect(result[0]!.cacheReadTokens).toBe(30);
    expect(result[0]!.cacheWriteTokens).toBe(15);
    expect(result[0]!.reasoningTokens).toBe(800);
  });
});
