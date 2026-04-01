import { describe, expect, it } from "vitest";

import { resolveTelemetry } from "@/core/agents/base/telemetry.js";

describe(resolveTelemetry, () => {
  it("returns undefined when both config and override are nil", () => {
    const result = resolveTelemetry({
      config: undefined,
      override: undefined,
      agentName: "test",
      agentChain: [],
    });
    expect(result).toBeUndefined();
  });

  it("auto-sets functionId to agentName when not provided", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true },
      override: undefined,
      agentName: "summarizer",
      agentChain: [{ id: "summarizer" }],
    });
    expect(result?.functionId).toBe("summarizer");
  });

  it("preserves explicit functionId from config", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true, functionId: "custom-id" },
      override: undefined,
      agentName: "summarizer",
      agentChain: [{ id: "summarizer" }],
    });
    expect(result?.functionId).toBe("custom-id");
  });

  it("override functionId takes precedence over config", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true, functionId: "config-id" },
      override: { functionId: "override-id" },
      agentName: "summarizer",
      agentChain: [{ id: "summarizer" }],
    });
    expect(result?.functionId).toBe("override-id");
  });

  it("shallow-merges metadata from config and override", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true, metadata: { env: "prod", region: "us" } },
      override: { metadata: { userId: "u-123", region: "eu" } },
      agentName: "test",
      agentChain: [{ id: "test" }],
    });
    expect(result?.metadata).toEqual({
      env: "prod",
      region: "eu",
      userId: "u-123",
      "funkai.agentChain": "test",
    });
  });

  it("serializes agent chain as ' > ' delimited string", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true },
      override: undefined,
      agentName: "search",
      agentChain: [{ id: "pipeline" }, { id: "writer" }, { id: "search" }],
    });
    expect(result?.metadata?.["funkai.agentChain"]).toBe("pipeline > writer > search");
  });

  it("handles empty agent chain", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true },
      override: undefined,
      agentName: "root",
      agentChain: [],
    });
    expect(result?.metadata?.["funkai.agentChain"]).toBe("");
  });

  it("override scalar fields take precedence over config", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true, recordInputs: true, recordOutputs: true },
      override: { recordInputs: false },
      agentName: "test",
      agentChain: [],
    });
    expect(result?.isEnabled).toBe(true);
    expect(result?.recordInputs).toBe(false);
    expect(result?.recordOutputs).toBe(true);
  });

  it("works with only override provided", () => {
    const result = resolveTelemetry({
      config: undefined,
      override: { isEnabled: true, functionId: "my-fn" },
      agentName: "test",
      agentChain: [{ id: "test" }],
    });
    expect(result?.isEnabled).toBe(true);
    expect(result?.functionId).toBe("my-fn");
    expect(result?.metadata?.["funkai.agentChain"]).toBe("test");
  });

  it("works with only config provided", () => {
    const result = resolveTelemetry({
      config: { isEnabled: true },
      override: undefined,
      agentName: "agent-a",
      agentChain: [{ id: "agent-a" }],
    });
    expect(result?.isEnabled).toBe(true);
    expect(result?.functionId).toBe("agent-a");
  });
});
