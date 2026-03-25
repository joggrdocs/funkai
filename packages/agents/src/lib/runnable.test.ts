import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { RunnableMeta } from "@/lib/runnable.js";
import {
  AGENT_CONFIG,
  FLOW_AGENT_CONFIG,
  RUNNABLE_META,
  getAgentConfig,
  getFlowAgentConfig,
  isAgent,
  isFlowAgent,
} from "@/lib/runnable.js";

describe("RUNNABLE_META symbol", () => {
  it("is a symbol", () => {
    expect(typeof RUNNABLE_META).toBe("symbol");
  });

  it("is globally registered via Symbol.for", () => {
    expect(RUNNABLE_META).toBe(Symbol.for("agent-sdk:runnable-meta"));
  });

  it("can be used as a property key on plain objects", () => {
    const meta: RunnableMeta = { name: "test-agent" };
    const obj: Record<symbol, RunnableMeta> = { [RUNNABLE_META]: meta };
    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
    expect(obj[RUNNABLE_META]).toBe(meta);
  });

  it("stores name and inputSchema", () => {
    const schema = z.object({ query: z.string() });
    const meta: RunnableMeta = { name: "search-agent", inputSchema: schema };
    const obj: Record<symbol, RunnableMeta> = { [RUNNABLE_META]: meta };

    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
    const stored = obj[RUNNABLE_META] as RunnableMeta;
    expect(stored.name).toBe("search-agent");
    expect(stored.inputSchema).toBe(schema);
  });

  it("allows inputSchema to be omitted", () => {
    const meta: RunnableMeta = { name: "simple-agent" };
    expect(meta.inputSchema).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Symbol keys
// ---------------------------------------------------------------------------

describe("AGENT_CONFIG symbol", () => {
  it("is a symbol", () => {
    expect(typeof AGENT_CONFIG).toBe("symbol");
  });

  it("is globally registered via Symbol.for", () => {
    expect(AGENT_CONFIG).toBe(Symbol.for("agent-sdk:agent-config"));
  });
});

describe("FLOW_AGENT_CONFIG symbol", () => {
  it("is a symbol", () => {
    expect(typeof FLOW_AGENT_CONFIG).toBe("symbol");
  });

  it("is globally registered via Symbol.for", () => {
    expect(FLOW_AGENT_CONFIG).toBe(Symbol.for("agent-sdk:flow-agent-config"));
  });
});

// ---------------------------------------------------------------------------
// IsAgent / isFlowAgent
// ---------------------------------------------------------------------------

describe(isAgent, () => {
  it("returns true for an object with AGENT_CONFIG", () => {
    const obj = { [AGENT_CONFIG]: { name: "test" } };
    expect(isAgent(obj)).toBe(true);
  });

  it("returns false for an object without AGENT_CONFIG", () => {
    expect(isAgent({ name: "test" })).toBe(false);
  });

  it("returns false for an object with FLOW_AGENT_CONFIG", () => {
    const obj = { [FLOW_AGENT_CONFIG]: { config: {}, handler: () => {} } };
    expect(isAgent(obj)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAgent(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAgent(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isAgent("not-an-agent")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isAgent(42)).toBe(false);
  });
});

describe(isFlowAgent, () => {
  it("returns true for an object with FLOW_AGENT_CONFIG", () => {
    const obj = { [FLOW_AGENT_CONFIG]: { config: {}, handler: () => {} } };
    expect(isFlowAgent(obj)).toBe(true);
  });

  it("returns false for an object without FLOW_AGENT_CONFIG", () => {
    expect(isFlowAgent({ name: "test" })).toBe(false);
  });

  it("returns false for an object with only AGENT_CONFIG", () => {
    const obj = { [AGENT_CONFIG]: { name: "test" } };
    expect(isFlowAgent(obj)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isFlowAgent(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFlowAgent(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GetAgentConfig / getFlowAgentConfig
// ---------------------------------------------------------------------------

describe(getAgentConfig, () => {
  it("returns the stored config from an Agent-like object", () => {
    const config = { name: "my-agent", model: "test" };
    const obj = { [AGENT_CONFIG]: config };

    const result = getAgentConfig(obj);
    expect(result).toBe(config);
  });

  it("returns undefined for a non-Agent object", () => {
    const result = getAgentConfig({ name: "test" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(getAgentConfig(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getAgentConfig(undefined)).toBeUndefined();
  });

  it("returns undefined when AGENT_CONFIG value is null", () => {
    const obj = { [AGENT_CONFIG]: null };
    expect(getAgentConfig(obj)).toBeUndefined();
  });

  it("returns undefined when AGENT_CONFIG value is undefined", () => {
    const obj = { [AGENT_CONFIG]: undefined };
    expect(getAgentConfig(obj)).toBeUndefined();
  });
});

describe(getFlowAgentConfig, () => {
  it("returns the stored config from a FlowAgent-like object", () => {
    const stored = { config: { name: "my-flow" }, handler: () => {} };
    const obj = { [FLOW_AGENT_CONFIG]: stored };

    const result = getFlowAgentConfig(obj);
    expect(result).toBe(stored);
  });

  it("returns undefined for a non-FlowAgent object", () => {
    const result = getFlowAgentConfig({ name: "test" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(getFlowAgentConfig(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getFlowAgentConfig(undefined)).toBeUndefined();
  });

  it("returns undefined when FLOW_AGENT_CONFIG value is null", () => {
    const obj = { [FLOW_AGENT_CONFIG]: null };
    expect(getFlowAgentConfig(obj)).toBeUndefined();
  });

  it("returns undefined when FLOW_AGENT_CONFIG value is undefined", () => {
    const obj = { [FLOW_AGENT_CONFIG]: undefined };
    expect(getFlowAgentConfig(obj)).toBeUndefined();
  });
});
