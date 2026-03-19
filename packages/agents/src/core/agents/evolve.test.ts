import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import { agent } from "@/core/agents/base/agent.js";
import { evolve } from "@/core/agents/evolve.js";
import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import { AGENT_CONFIG, FLOW_AGENT_CONFIG } from "@/lib/runnable.js";
import { createMockLogger } from "@/testing/index.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();
const mockStepCountIs = vi.fn<(n: number) => string>().mockReturnValue("mock-stop-condition");

vi.mock(
  import("ai"),
  () =>
    ({
      generateText: (...args: unknown[]) => mockGenerateText(...args),
      streamText: (...args: unknown[]) => mockStreamText(...args),
      stepCountIs: (n: number) => mockStepCountIs(n),
      Output: {
        text: () => ({ parseCompleteOutput: vi.fn() }),
        object: ({ schema }: { schema: unknown }) => ({ parseCompleteOutput: vi.fn(), schema }),
        array: ({ element }: { element: unknown }) => ({ parseCompleteOutput: vi.fn(), element }),
        choice: () => ({ parseCompleteOutput: vi.fn() }),
        json: () => ({ parseCompleteOutput: vi.fn() }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory must return partial shape
    }) as any,
);

vi.mock(
  import("@/lib/middleware.js"),
  () =>
    ({
      withModelMiddleware: vi.fn(async ({ model }: { model: unknown }) => model),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory must return partial shape
    }) as any,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Input = z.object({ text: z.string() });
const Output = z.object({ result: z.string() });

const mockModel = { modelId: "test-model" } as never;
const mockModelAlt = { modelId: "alt-model" } as never;

function createTestAgent() {
  return agent({
    name: "base-agent",
    model: mockModel,
    system: "You are a test agent.",
    input: Input,
    output: Output,
    logger: createMockLogger(),
  });
}

function createTestFlowAgent() {
  return flowAgent<{ text: string }, { result: string }>(
    {
      name: "base-flow",
      input: Input,
      output: Output,
      logger: createMockLogger(),
    },
    async ({ input }) => ({ result: input.text.toUpperCase() }),
  );
}

function createTestFlowAgentWithoutOutput() {
  return flowAgent<{ text: string }>(
    {
      name: "base-flow-void",
      input: Input,
      logger: createMockLogger(),
    },
    async () => {},
  );
}

/**
 * Read the stored agent config from the symbol key.
 */
function readAgentConfig(a: unknown): Record<string, unknown> | undefined {
  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access
  return (a as Record<symbol, unknown>)[AGENT_CONFIG] as Record<string, unknown> | undefined;
}

/**
 * Read the stored flow agent config from the symbol key.
 */
function readFlowConfig(fa: unknown): { config: Record<string, unknown> } | undefined {
  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access
  return (fa as Record<symbol, unknown>)[FLOW_AGENT_CONFIG] as
    | { config: Record<string, unknown> }
    | undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("evolve() with Agent", () => {
  it("returns a new agent with overridden name", () => {
    const base = createTestAgent();
    const evolved = evolve(base, { name: "evolved-agent" });

    const config = readAgentConfig(evolved);
    expect(config).toBeDefined();
    expect(config?.name).toBe("evolved-agent");
  });

  it("preserves base config fields not overridden", () => {
    const base = createTestAgent();
    const evolved = evolve(base, { name: "evolved-agent" });

    const config = readAgentConfig(evolved);
    expect(config?.system).toBe("You are a test agent.");
    expect(config?.model).toBe(mockModel);
  });

  it("overrides scalar config fields", () => {
    const base = createTestAgent();
    const evolved = evolve(base, {
      model: mockModelAlt,
      system: "New system prompt.",
    });

    const config = readAgentConfig(evolved);
    expect(config?.model).toBe(mockModelAlt);
    expect(config?.system).toBe("New system prompt.");
  });

  it("shallow merges tools — overriding an existing key", () => {
    const toolA = { execute: vi.fn() } as never;
    const toolB = { execute: vi.fn() } as never;
    const toolBReplacement = { execute: vi.fn() } as never;

    const base = agent({
      name: "tooled",
      model: mockModel,
      tools: { a: toolA, b: toolB },
      logger: createMockLogger(),
    });

    // Evolve's generic requires all tool keys in the Partial,
    // But runtime merge is a shallow { ...base, ...override }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing runtime merge behavior
    const evolved = evolve(base as any, { tools: { b: toolBReplacement } });
    const config = readAgentConfig(evolved);
    const tools = config?.tools as Record<string, unknown>;

    expect(tools.a).toBe(toolA);
    expect(tools.b).toBe(toolBReplacement);
  });

  it("shallow merges agents — overriding an existing subagent", () => {
    const subA = agent({ name: "sub-a", model: mockModel, logger: createMockLogger() });
    const subB = agent({ name: "sub-b", model: mockModel, logger: createMockLogger() });
    const subBReplacement = agent({
      name: "sub-b-v2",
      model: mockModel,
      logger: createMockLogger(),
    });

    const base = agent({
      name: "parent",
      model: mockModel,
      agents: { a: subA, b: subB },
      logger: createMockLogger(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing runtime merge behavior
    const evolved = evolve(base as any, { agents: { b: subBReplacement } });
    const config = readAgentConfig(evolved);
    const agents = config?.agents as Record<string, unknown>;

    expect(agents.a).toBe(subA);
    expect(agents.b).toBe(subBReplacement);
  });

  it("does not mutate the base agent", () => {
    const base = createTestAgent();
    const baseCfg = readAgentConfig(base);

    evolve(base, { name: "evolved", system: "Changed." });

    const baseCfgAfter = readAgentConfig(base);
    expect(baseCfgAfter?.name).toBe("base-agent");
    expect(baseCfgAfter?.system).toBe("You are a test agent.");
    expect(baseCfgAfter).toEqual(baseCfg);
  });

  it("returns an agent with generate, stream, and fn methods", () => {
    const base = createTestAgent();
    const evolved = evolve(base, { name: "evolved" });

    expect(typeof evolved.generate).toBe("function");
    expect(typeof evolved.stream).toBe("function");
    expect(typeof evolved.fn).toBe("function");
  });

  it("preserves tools when override has no tools field", () => {
    const toolA = { execute: vi.fn() } as never;

    const base = agent({
      name: "tooled",
      model: mockModel,
      tools: { a: toolA },
      logger: createMockLogger(),
    });

    const evolved = evolve(base, { name: "renamed" });
    const config = readAgentConfig(evolved);
    const tools = config?.tools as Record<string, unknown>;

    expect(tools.a).toBe(toolA);
  });
});

describe("evolve() with FlowAgent", () => {
  it("returns a new flow agent with overridden name", () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, { name: "evolved-flow" });

    const stored = readFlowConfig(evolved);
    expect(stored).toBeDefined();
    expect(stored?.config.name).toBe("evolved-flow");
  });

  it("preserves base config fields not overridden", () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, { name: "evolved-flow" });

    const stored = readFlowConfig(evolved);
    expect(stored?.config.input).toBe(Input);
    expect(stored?.config.output).toBe(Output);
  });

  it("overrides scalar config fields", () => {
    const newLogger = createMockLogger();
    const base = createTestFlowAgent();
    const evolved = evolve(base, { logger: newLogger });

    const stored = readFlowConfig(evolved);
    expect(stored?.config.logger).toBe(newLogger);
  });

  it("does not mutate the base flow agent", () => {
    const base = createTestFlowAgent();
    const baseCfg = readFlowConfig(base);

    evolve(base, { name: "evolved-flow" });

    const baseCfgAfter = readFlowConfig(base);
    expect(baseCfgAfter?.config.name).toBe("base-flow");
    expect(baseCfgAfter).toEqual(baseCfg);
  });

  it("returns a flow agent with generate, stream, and fn methods", () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, { name: "evolved" });

    expect(typeof evolved.generate).toBe("function");
    expect(typeof evolved.stream).toBe("function");
    expect(typeof evolved.fn).toBe("function");
  });

  it("preserves the handler when none is provided", async () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, { name: "evolved-flow" });

    const result = await evolved.generate({ input: { text: "hello" } });
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.output).toEqual({ result: "HELLO" });
    }
  });

  it("replaces the handler when a new one is provided", async () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, { name: "evolved-flow" }, async ({ input }) => ({
      result: `replaced:${input.text}`,
    }));

    const result = await evolved.generate({ input: { text: "test" } });
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.output).toEqual({ result: "replaced:test" });
    }
  });

  it("works with flow agents without output schema", async () => {
    const base = createTestFlowAgentWithoutOutput();
    const evolved = evolve(base, { name: "evolved-void" });

    expect(typeof evolved.generate).toBe("function");

    const stored = readFlowConfig(evolved);
    expect(stored?.config.name).toBe("evolved-void");
  });

  it("overrides hooks on flow agent", () => {
    const onStart = vi.fn();
    const base = createTestFlowAgent();
    const evolved = evolve(base, { onStart });

    const stored = readFlowConfig(evolved);
    expect(stored?.config.onStart).toBe(onStart);
  });
});

describe("evolve() with Agent mapper function", () => {
  it("receives the stored config and applies returned overrides", () => {
    const base = createTestAgent();
    const evolved = evolve(base, (config) => ({
      name: `${config.name}-evolved`,
    }));

    const config = readAgentConfig(evolved);
    expect(config?.name).toBe("base-agent-evolved");
  });

  it("can override model via mapper", () => {
    const base = createTestAgent();
    const evolved = evolve(base, () => ({
      model: mockModelAlt,
    }));

    const config = readAgentConfig(evolved);
    expect(config?.model).toBe(mockModelAlt);
  });

  it("preserves base config fields not in mapper return", () => {
    const base = createTestAgent();
    const evolved = evolve(base, () => ({
      name: "mapper-only-name",
    }));

    const config = readAgentConfig(evolved);
    expect(config?.system).toBe("You are a test agent.");
    expect(config?.model).toBe(mockModel);
    expect(config?.input).toBe(Input);
    expect(config?.output).toBe(Output);
  });

  it("shallow merges tools from mapper return", () => {
    const toolA = { execute: vi.fn() } as never;
    const toolB = { execute: vi.fn() } as never;
    const toolBReplacement = { execute: vi.fn() } as never;

    const base = agent({
      name: "tooled",
      model: mockModel,
      tools: { a: toolA, b: toolB },
      logger: createMockLogger(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing runtime merge behavior
    const evolved = evolve(base as any, () => ({ tools: { b: toolBReplacement } }));
    const config = readAgentConfig(evolved);
    const tools = config?.tools as Record<string, unknown>;

    expect(tools.a).toBe(toolA);
    expect(tools.b).toBe(toolBReplacement);
  });

  it("does not mutate the base agent", () => {
    const base = createTestAgent();
    const baseCfg = readAgentConfig(base);

    evolve(base, () => ({ name: "evolved", system: "Changed." }));

    const baseCfgAfter = readAgentConfig(base);
    expect(baseCfgAfter?.name).toBe("base-agent");
    expect(baseCfgAfter?.system).toBe("You are a test agent.");
    expect(baseCfgAfter).toEqual(baseCfg);
  });

  it("returns an agent with generate, stream, and fn methods", () => {
    const base = createTestAgent();
    const evolved = evolve(base, () => ({ name: "evolved" }));

    expect(typeof evolved.generate).toBe("function");
    expect(typeof evolved.stream).toBe("function");
    expect(typeof evolved.fn).toBe("function");
  });
});

describe("evolve() with FlowAgent mapper function", () => {
  it("receives the stored flow config and applies returned overrides", () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, (config) => ({
      name: `${config.name}-evolved`,
    }));

    const stored = readFlowConfig(evolved);
    expect(stored?.config.name).toBe("base-flow-evolved");
  });

  it("preserves handler when using mapper form", async () => {
    const base = createTestFlowAgent();
    const evolved = evolve(base, () => ({ name: "mapper-flow" }));

    const result = await evolved.generate({ input: { text: "hello" } });
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.output).toEqual({ result: "HELLO" });
    }
  });

  it("replaces handler when provided with mapper form", async () => {
    const base = createTestFlowAgent();
    const evolved = evolve(
      base,
      () => ({ name: "mapper-flow" }),
      async ({ input }) => ({ result: `mapped:${input.text}` }),
    );

    const result = await evolved.generate({ input: { text: "test" } });
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.output).toEqual({ result: "mapped:test" });
    }
  });

  it("does not mutate the base flow agent", () => {
    const base = createTestFlowAgent();
    const baseCfg = readFlowConfig(base);

    evolve(base, () => ({ name: "evolved-flow" }));

    const baseCfgAfter = readFlowConfig(base);
    expect(baseCfgAfter?.config.name).toBe("base-flow");
    expect(baseCfgAfter).toEqual(baseCfg);
  });
});

describe("evolve() error handling", () => {
  it("throws for a plain object that is not an agent", () => {
    const fake = { generate: vi.fn(), stream: vi.fn(), fn: vi.fn() };

    expect(() => evolve(fake as never, {})).toThrow("evolve() requires an Agent or FlowAgent");
  });

  it("throws for null", () => {
    expect(() => evolve(null as never, {})).toThrow("evolve() requires an Agent or FlowAgent");
  });

  it("throws for undefined", () => {
    expect(() => evolve(undefined as never, {})).toThrow("evolve() requires an Agent or FlowAgent");
  });

  it("throws for a string", () => {
    expect(() => evolve("not-an-agent" as never, {})).toThrow(
      "evolve() requires an Agent or FlowAgent",
    );
  });
});
