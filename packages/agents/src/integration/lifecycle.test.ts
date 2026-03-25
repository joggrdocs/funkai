import { simulateReadableStream } from "ai";
/**
 * Integration tests for lifecycle event propagation.
 *
 * These tests exercise the full stack — real `agent()`, `flowAgent()`,
 * `MockLanguageModelV3` from the AI SDK — to verify that hooks fire
 * at every nesting level and that stream events propagate correctly.
 *
 * No vi.mock() calls — everything is wired together as it would be
 * in production, with mock models standing in for real LLMs.
 */
import { MockLanguageModelV3, mockValues } from "ai/test";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

import { agent } from "@/core/agents/base/agent.js";
import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import type { StepFinishEvent, StepStartEvent, StreamPart } from "@/core/types.js";
import { createMockLogger } from "@/testing/index.js";

// ---------------------------------------------------------------------------
// Mock middleware — bypass devtools import
// ---------------------------------------------------------------------------

vi.mock(
  import("@/lib/middleware.js"),
  () =>
    ({
      withModelMiddleware: vi.fn(async ({ model }: { model: unknown }) => model),
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory must return partial shape
    }) as any,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

const MOCK_FINISH = { unified: "stop" as const, raw: undefined };

function createMockModel(text = "mock response") {
  return new MockLanguageModelV3({
    doGenerate: mockValues({
      content: [{ type: "text" as const, text }],
      finishReason: MOCK_FINISH,
      usage: MOCK_USAGE,
      warnings: [],
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, but MockLanguageModelV3 expects PromiseLike
    }) as any,
    doStream: mockValues({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t1" },
          { type: "text-delta" as const, id: "t1", delta: text },
          { type: "text-end" as const, id: "t1" },
          {
            type: "finish" as const,
            finishReason: MOCK_FINISH,
            logprobs: undefined,
            usage: MOCK_USAGE,
          },
        ],
        chunkDelayInMs: 0,
      }),
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, but MockLanguageModelV3 expects PromiseLike
    }) as any,
  });
}

interface LifecycleEvent {
  type: string;
  detail?: string;
}

function createLifecycleTracker() {
  const events: LifecycleEvent[] = [];

  return {
    events,
    onStart: vi.fn((_event: { input: unknown }) => {
      events.push({ type: "onStart" });
    }),
    onFinish: vi.fn((_event: { input: unknown; result: unknown; duration: number }) => {
      events.push({ type: "onFinish" });
    }),
    onError: vi.fn((_event: { input: unknown; error: Error }) => {
      events.push({ type: "onError" });
    }),
    onStepStart: vi.fn((event: StepStartEvent) => {
      events.push({ type: "onStepStart", detail: event.stepId });
    }),
    onStepFinish: vi.fn((event: StepFinishEvent) => {
      const id = event.stepId;
      events.push({ type: "onStepFinish", detail: id });
    }),
  };
}

// ---------------------------------------------------------------------------
// Agent lifecycle
// ---------------------------------------------------------------------------

describe("Agent lifecycle (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires onStart, onStepFinish, onFinish in order for generate()", async () => {
    const tracker = createLifecycleTracker();

    const a = agent({
      name: "test-agent",
      model: createMockModel(),
      system: "You are helpful.",
      logger: createMockLogger(),
      onStart: tracker.onStart,
      onFinish: tracker.onFinish,
      onStepFinish: tracker.onStepFinish,
    });

    const result = await a.generate({ prompt: "hello" });

    expect(result.ok).toBe(true);
    expect(tracker.onStart).toHaveBeenCalledTimes(1);
    expect(tracker.onFinish).toHaveBeenCalledTimes(1);
    // At least one step from the tool loop
    expect(tracker.onStepFinish).toHaveBeenCalled();

    // Order: onStart fires before onFinish
    const startIdx = tracker.events.findIndex((e) => e.type === "onStart");
    const finishIdx = tracker.events.findIndex((e) => e.type === "onFinish");
    expect(startIdx).toBeLessThan(finishIdx);
  });

  it("fires onStart, onStepFinish, onFinish in order for stream()", async () => {
    const tracker = createLifecycleTracker();

    const a = agent({
      name: "stream-agent",
      model: createMockModel(),
      system: "You are helpful.",
      logger: createMockLogger(),
      onStart: tracker.onStart,
      onFinish: tracker.onFinish,
      onStepFinish: tracker.onStepFinish,
    });

    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // Drain the stream
    for await (const _part of result.fullStream) {
      /* Consume */
    }

    // Wait for finish hook to settle
    await result.output;

    expect(tracker.onStart).toHaveBeenCalledTimes(1);
    expect(tracker.onFinish).toHaveBeenCalledTimes(1);
    expect(tracker.onStepFinish).toHaveBeenCalled();
  });

  it("fires onError (not onFinish) when model throws during generate()", async () => {
    const tracker = createLifecycleTracker();

    const failModel = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("model exploded");
      },
    });

    const a = agent({
      name: "fail-agent",
      model: failModel,
      logger: createMockLogger(),
      onStart: tracker.onStart,
      onFinish: tracker.onFinish,
      onError: tracker.onError,
    });

    const result = await a.generate({ prompt: "hello" });

    expect(result.ok).toBe(false);
    expect(tracker.onStart).toHaveBeenCalledTimes(1);
    expect(tracker.onError).toHaveBeenCalledTimes(1);
    expect(tracker.onFinish).not.toHaveBeenCalled();
  });

  it("merges config hooks and per-call hooks (config first)", async () => {
    const order: string[] = [];

    const a = agent({
      name: "merge-agent",
      model: createMockModel(),
      logger: createMockLogger(),
      onStart: () => {
        order.push("config:onStart");
      },
      onFinish: () => {
        order.push("config:onFinish");
      },
    });

    await a.generate({
      prompt: "hello",
      onStart: () => {
        order.push("call:onStart");
      },
      onFinish: () => {
        order.push("call:onFinish");
      },
    });

    expect(order).toEqual(["config:onStart", "call:onStart", "config:onFinish", "call:onFinish"]);
  });
});

// ---------------------------------------------------------------------------
// FlowAgent lifecycle — direct steps
// ---------------------------------------------------------------------------

describe("FlowAgent lifecycle — direct steps (integration)", () => {
  const Input = z.object({ x: z.number() });
  const Output = z.object({ y: z.number() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires onStart, onStepStart/Finish for each step, then onFinish", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "step-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStart: tracker.onStart,
        onFinish: tracker.onFinish,
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        await $.step({ id: "double", execute: async () => input.x * 2 });
        await $.step({ id: "add-one", execute: async () => input.x * 2 + 1 });
        return { y: input.x * 2 };
      },
    );

    const result = await fa.generate({ input: { x: 5 } });

    expect(result.ok).toBe(true);
    expect(tracker.events).toEqual([
      { type: "onStart" },
      { type: "onStepStart", detail: "double" },
      { type: "onStepFinish", detail: "double" },
      { type: "onStepStart", detail: "add-one" },
      { type: "onStepFinish", detail: "add-one" },
      { type: "onFinish" },
    ]);
  });

  it("fires onStepStart/Finish for nested steps inside $.step()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "nested-step-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $: $outer }) => {
        await $outer.step({
          id: "outer",
          execute: async ({ $ }) => {
            await $.step({ id: "inner", execute: async () => input.x + 1 });
            return input.x * 2;
          },
        });
        return { y: input.x * 2 };
      },
    );

    const result = await fa.generate({ input: { x: 3 } });

    expect(result.ok).toBe(true);
    expect(tracker.events).toEqual([
      { type: "onStepStart", detail: "outer" },
      { type: "onStepStart", detail: "inner" },
      { type: "onStepFinish", detail: "inner" },
      { type: "onStepFinish", detail: "outer" },
    ]);
  });

  it("fires hooks for steps inside $.map()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "map-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $: $outer }) => {
        await $outer.map({
          id: "batch",
          input: [1, 2],
          execute: async ({ item, $ }) => {
            const r = await $.step({
              id: `process-${item}`,
              execute: async () => item * input.x,
            });
            if (r.ok) {
              return r.output;
            }
            return 0;
          },
        });
        return { y: input.x };
      },
    );

    const result = await fa.generate({ input: { x: 10 } });

    expect(result.ok).toBe(true);

    // Should have: batch start, process-1 start/finish, process-2 start/finish, batch finish
    const stepIds = tracker.events.map((e) => `${e.type}:${e.detail}`);
    expect(stepIds).toContain("onStepStart:batch");
    expect(stepIds).toContain("onStepStart:process-1");
    expect(stepIds).toContain("onStepFinish:process-1");
    expect(stepIds).toContain("onStepStart:process-2");
    expect(stepIds).toContain("onStepFinish:process-2");
    expect(stepIds).toContain("onStepFinish:batch");
  });

  it("fires hooks for steps inside $.each()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "each-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $: $outer }) => {
        await $outer.each({
          id: "iterate",
          input: [1, 2],
          execute: async ({ item, $ }) => {
            await $.step({
              id: `item-${item}`,
              execute: async () => item * input.x,
            });
          },
        });
        return { y: input.x };
      },
    );

    const result = await fa.generate({ input: { x: 5 } });

    expect(result.ok).toBe(true);

    const stepIds = tracker.events.map((e) => `${e.type}:${e.detail}`);
    expect(stepIds).toContain("onStepStart:iterate");
    expect(stepIds).toContain("onStepStart:item-1");
    expect(stepIds).toContain("onStepFinish:item-1");
    expect(stepIds).toContain("onStepStart:item-2");
    expect(stepIds).toContain("onStepFinish:item-2");
    expect(stepIds).toContain("onStepFinish:iterate");
  });

  it("fires hooks for steps inside $.reduce()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "reduce-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        const r = await $.reduce({
          id: "sum",
          input: [1, 2, 3],
          initial: 0,
          execute: async ({ item, accumulator }) => accumulator + item * input.x,
        });
        if (r.ok) {
          return { y: r.output };
        }
        return { y: 0 };
      },
    );

    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: 6 });

    const stepIds = tracker.events.map((e) => `${e.type}:${e.detail}`);
    expect(stepIds).toContain("onStepStart:sum");
    expect(stepIds).toContain("onStepFinish:sum");
  });

  it("onStepFinish fires even when a step errors", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "error-step-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        const r = await $.step({
          id: "fail-step",
          execute: async () => {
            throw new Error("step boom");
          },
        });
        if (r.ok) {
          return { y: 0 };
        }
        return { y: -1 };
      },
    );

    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: -1 });

    expect(tracker.events).toEqual([
      { type: "onStepStart", detail: "fail-step" },
      { type: "onStepFinish", detail: "fail-step" },
    ]);

    // Verify the onStepFinish event has output: undefined on error
    const finishEvent = tracker.onStepFinish.mock.calls[0]?.[0] as StepFinishEvent;
    expect(finishEvent.output).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// FlowAgent with $.agent() — agent hooks propagate
// ---------------------------------------------------------------------------

describe("FlowAgent with $.agent() (integration)", () => {
  const Input = z.object({ topic: z.string() });
  const Output = z.object({ summary: z.string() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires flow onStepStart/Finish for $.agent() steps", async () => {
    const tracker = createLifecycleTracker();

    const writer = agent({
      name: "writer",
      model: createMockModel("written content"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ topic: string }, { summary: string }>(
      {
        name: "agent-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStart: tracker.onStart,
        onFinish: tracker.onFinish,
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        const r = await $.agent({
          id: "write",
          agent: writer,
          input: `Write about ${input.topic}`,
        });

        if (r.ok) {
          return { summary: String(r.output) };
        }
        return { summary: "failed" };
      },
    );

    const result = await fa.generate({ input: { topic: "TypeScript" } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output.summary).toBe("written content");

    expect(tracker.events).toEqual([
      { type: "onStart" },
      { type: "onStepStart", detail: "write" },
      // Sub-agent internal tool-loop step (forwarded via hook propagation)
      { type: "onStepFinish", detail: "writer:0" },
      { type: "onStepFinish", detail: "write" },
      { type: "onFinish" },
    ]);
  });

  it("fires flow hooks for multiple $.agent() calls in sequence", async () => {
    const tracker = createLifecycleTracker();

    const researcher = agent({
      name: "researcher",
      model: createMockModel("research findings"),
      logger: createMockLogger(),
    });

    const writer = agent({
      name: "writer",
      model: createMockModel("final article"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ topic: string }, { summary: string }>(
      {
        name: "pipeline",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        const research = await $.agent({
          id: "research",
          agent: researcher,
          input: input.topic,
        });

        let researchInput = "";
        if (research.ok) {
          researchInput = String(research.output);
        }
        const article = await $.agent({
          id: "write",
          agent: writer,
          input: researchInput,
        });

        if (article.ok) {
          return { summary: String(article.output) };
        }
        return { summary: "failed" };
      },
    );

    const result = await fa.generate({ input: { topic: "AI" } });

    expect(result.ok).toBe(true);
    expect(tracker.events).toEqual([
      { type: "onStepStart", detail: "research" },
      { type: "onStepFinish", detail: "researcher:0" },
      { type: "onStepFinish", detail: "research" },
      { type: "onStepStart", detail: "write" },
      { type: "onStepFinish", detail: "writer:0" },
      { type: "onStepFinish", detail: "write" },
    ]);
  });

  it("fires flow hooks for $.agent() inside $.map()", async () => {
    const tracker = createLifecycleTracker();

    const processor = agent({
      name: "processor",
      model: createMockModel("processed"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ topic: string }, { summary: string }>(
      {
        name: "map-agent-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ $: $outer, input }) => {
        await $outer.map({
          id: "batch",
          input: ["a", "b"],
          execute: async ({ item, $ }) => {
            const r = await $.agent({
              id: `process-${item}`,
              agent: processor,
              input: item,
            });
            if (r.ok) {
              return String(r.output);
            }
            return "";
          },
        });

        return { summary: input.topic };
      },
    );

    const result = await fa.generate({ input: { topic: "test" } });

    expect(result.ok).toBe(true);

    const stepIds = tracker.events.map((e) => `${e.type}:${e.detail}`);
    expect(stepIds).toContain("onStepStart:batch");
    expect(stepIds).toContain("onStepStart:process-a");
    expect(stepIds).toContain("onStepFinish:process-a");
    expect(stepIds).toContain("onStepStart:process-b");
    expect(stepIds).toContain("onStepFinish:process-b");
    expect(stepIds).toContain("onStepFinish:batch");
  });
});

// ---------------------------------------------------------------------------
// FlowAgent with agents config dependency
// ---------------------------------------------------------------------------

describe("FlowAgent agents dependency lifecycle (integration)", () => {
  const Input = z.object({ text: z.string() });
  const Output = z.object({ result: z.string() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes agents from config and fires hooks for $.agent() using them", async () => {
    const tracker = createLifecycleTracker();

    const core = agent({
      name: "core",
      model: createMockModel("core output"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "dep-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        agents: { core },
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $, agents }) => {
        const r = await $.agent({
          id: "run-core",
          // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- FlowSubAgents union includes FlowAgent; narrow to Agent for $.agent()
          agent: agents["core"] as any,
          input: input.text,
        });
        if (r.ok) {
          return { result: String(r.output) };
        }
        return { result: "failed" };
      },
    );

    const result = await fa.generate({ input: { text: "hello" } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output.result).toBe("core output");

    expect(tracker.events).toEqual([
      { type: "onStepStart", detail: "run-core" },
      { type: "onStepFinish", detail: "core:0" },
      { type: "onStepFinish", detail: "run-core" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Deep nesting — 3+ levels
// ---------------------------------------------------------------------------

describe("Deep nesting lifecycle (integration)", () => {
  const Input = z.object({ items: z.array(z.string()) });
  const Output = z.object({ results: z.array(z.string()) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates onStepStart/Finish through 3 nesting levels", async () => {
    const tracker = createLifecycleTracker();

    const processor = agent({
      name: "processor",
      model: createMockModel("result"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ items: string[] }, { results: string[] }>(
      {
        name: "deep-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $: $flow }) => {
        // Level 1: $.step()
        const r = await $flow.step({
          id: "outer",
          execute: async ({ $: $step }) => {
            // Level 2: $.map() inside $.step()
            const mapResult = await $step.map({
              id: "batch",
              input: input.items,
              execute: async ({ item, $ }) => {
                // Level 3: $.agent() inside $.map() inside $.step()
                const agentResult = await $.agent({
                  id: `process-${item}`,
                  agent: processor,
                  input: item,
                });
                if (agentResult.ok) {
                  return String(agentResult.output);
                }
                return "";
              },
            });
            if (mapResult.ok) {
              return mapResult.output;
            }
            return [];
          },
        });

        if (r.ok) {
          return { results: r.output };
        }
        return { results: [] };
      },
    );

    const result = await fa.generate({ input: { items: ["x", "y"] } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output.results).toEqual(["result", "result"]);

    // Verify ALL nesting levels fired hooks
    const stepIds = tracker.events.map((e) => `${e.type}:${e.detail}`);

    // Level 1
    expect(stepIds).toContain("onStepStart:outer");
    expect(stepIds).toContain("onStepFinish:outer");

    // Level 2
    expect(stepIds).toContain("onStepStart:batch");
    expect(stepIds).toContain("onStepFinish:batch");

    // Level 3
    expect(stepIds).toContain("onStepStart:process-x");
    expect(stepIds).toContain("onStepFinish:process-x");
    expect(stepIds).toContain("onStepStart:process-y");
    expect(stepIds).toContain("onStepFinish:process-y");

    // Verify nesting order: outer starts first, finishes last
    const outerStartIdx = tracker.events.findIndex(
      (e) => e.type === "onStepStart" && e.detail === "outer",
    );
    const outerFinishIdx = tracker.events.findIndex(
      (e) => e.type === "onStepFinish" && e.detail === "outer",
    );
    const batchStartIdx = tracker.events.findIndex(
      (e) => e.type === "onStepStart" && e.detail === "batch",
    );
    const batchFinishIdx = tracker.events.findIndex(
      (e) => e.type === "onStepFinish" && e.detail === "batch",
    );

    expect(outerStartIdx).toBeLessThan(batchStartIdx);
    expect(batchFinishIdx).toBeLessThan(outerFinishIdx);
  });
});

// ---------------------------------------------------------------------------
// Streaming lifecycle — FlowAgent
// ---------------------------------------------------------------------------

describe("FlowAgent streaming lifecycle (integration)", () => {
  const Input = z.object({ x: z.number() });
  const Output = z.object({ y: z.number() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires onStart, onStepStart/Finish, onFinish during stream()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "stream-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStart: tracker.onStart,
        onFinish: tracker.onFinish,
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        await $.step({ id: "compute", execute: async () => input.x * 2 });
        return { y: input.x * 2 };
      },
    );

    const result = await fa.stream({ input: { x: 4 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const parts: StreamPart[] = [];
    for await (const part of result.fullStream) {
      parts.push(part);
    }

    await result.output;

    expect(tracker.events).toEqual([
      { type: "onStart" },
      { type: "onStepStart", detail: "compute" },
      { type: "onStepFinish", detail: "compute" },
      { type: "onFinish" },
    ]);

    // Stream should contain tool-call, tool-result, and finish events
    const types = parts.map((p) => p.type);
    expect(types).toContain("tool-call");
    expect(types).toContain("tool-result");
    expect(types).toContain("finish");
  });

  it("fires hooks for nested steps during stream()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "nested-stream-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $: $outer }) => {
        await $outer.step({
          id: "outer",
          execute: async ({ $ }) => {
            await $.step({ id: "inner", execute: async () => input.x + 1 });
            return input.x * 2;
          },
        });
        return { y: input.x * 2 };
      },
    );

    const result = await fa.stream({ input: { x: 3 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    for await (const _part of result.fullStream) {
      /* Drain */
    }
    await result.output;

    expect(tracker.events).toEqual([
      { type: "onStepStart", detail: "outer" },
      { type: "onStepStart", detail: "inner" },
      { type: "onStepFinish", detail: "inner" },
      { type: "onStepFinish", detail: "outer" },
    ]);
  });

  it("fires hooks for $.agent() during stream()", async () => {
    const tracker = createLifecycleTracker();

    const writer = agent({
      name: "writer",
      model: createMockModel("streamed content"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "agent-stream-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: tracker.onStepStart,
        onStepFinish: tracker.onStepFinish,
      },
      async ({ input, $ }) => {
        await $.agent({
          id: "write",
          agent: writer,
          input: `Write about ${input.x}`,
        });
        return { y: input.x };
      },
    );

    const result = await fa.stream({ input: { x: 7 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    for await (const _part of result.fullStream) {
      /* Drain */
    }
    await result.output;

    expect(tracker.events).toEqual([
      { type: "onStepStart", detail: "write" },
      { type: "onStepFinish", detail: "writer:0" },
      { type: "onStepFinish", detail: "write" },
    ]);
  });

  it("stream emits tool-call and tool-result events for $.agent() with stream: true", async () => {
    const writer = agent({
      name: "stream-writer",
      model: createMockModel("streaming text"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "stream-agent-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ input, $ }) => {
        await $.agent({
          id: "write",
          agent: writer,
          input: `Write about ${input.x}`,
          stream: true,
        });
        return { y: input.x };
      },
    );

    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const parts: StreamPart[] = [];
    for await (const part of result.fullStream) {
      parts.push(part);
    }

    const types = parts.map((p) => p.type);
    expect(types).toContain("tool-call");
    expect(types).toContain("text-delta");
    expect(types).toContain("tool-result");
    expect(types).toContain("finish");
  });

  it("fires onError (not onFinish) when handler throws during stream()", async () => {
    const tracker = createLifecycleTracker();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "error-stream-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStart: tracker.onStart,
        onFinish: tracker.onFinish,
        onError: tracker.onError,
      },
      async () => {
        throw new Error("stream handler fail");
      },
    );

    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // Suppress derived promise rejections
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    for await (const _part of result.fullStream) {
      /* Drain */
    }

    await result.output.catch(() => {});

    expect(tracker.onStart).toHaveBeenCalledTimes(1);
    expect(tracker.onError).toHaveBeenCalledTimes(1);
    expect(tracker.onFinish).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Per-call hook override merging with flow agents
// ---------------------------------------------------------------------------

describe("FlowAgent per-call hook merging (integration)", () => {
  const Input = z.object({ x: z.number() });
  const Output = z.object({ y: z.number() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges config + per-call hooks for onStart, onStepStart, onStepFinish, onFinish", async () => {
    const order: string[] = [];

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "merge-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStart: () => {
          order.push("config:onStart");
        },
        onFinish: () => {
          order.push("config:onFinish");
        },
        onStepStart: ({ stepId }) => {
          order.push(`config:onStepStart:${stepId}`);
        },
        onStepFinish: ({ stepId }) => {
          order.push(`config:onStepFinish:${stepId}`);
        },
      },
      async ({ input, $ }) => {
        await $.step({ id: "work", execute: async () => input.x });
        return { y: input.x };
      },
    );

    await fa.generate({
      input: { x: 1 },
      onStart: () => {
        order.push("call:onStart");
      },
      onFinish: () => {
        order.push("call:onFinish");
      },
      onStepStart: ({ stepId }) => {
        order.push(`call:onStepStart:${stepId}`);
      },
      onStepFinish: ({ stepId }) => {
        order.push(`call:onStepFinish:${stepId}`);
      },
    });

    expect(order).toEqual([
      "config:onStart",
      "call:onStart",
      "config:onStepStart:work",
      "call:onStepStart:work",
      "config:onStepFinish:work",
      "call:onStepFinish:work",
      "config:onFinish",
      "call:onFinish",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Value forwarding — logger, signal, config
// ---------------------------------------------------------------------------

describe("Value forwarding (integration)", () => {
  const Input = z.object({ text: z.string() });
  const Output = z.object({ result: z.string() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards scoped child logger to $.agent() sub-agent", async () => {
    const childCalls: Record<string, unknown>[] = [];

    // Track every .child() call and what bindings it receives
    function createTrackingLogger(): ReturnType<typeof createMockLogger> {
      const logger = createMockLogger();
      const originalChild = logger.child as ReturnType<typeof vi.fn>;
      originalChild.mockImplementation((bindings: Record<string, unknown>) => {
        childCalls.push(bindings);
        return createTrackingLogger();
      });
      return logger;
    }

    const trackingLogger = createTrackingLogger();

    const core = agent({
      name: "core-agent",
      model: createMockModel("core output"),
      // No logger here — it should receive one from the flow
    });

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "logger-flow",
        input: Input,
        output: Output,
        logger: trackingLogger,
      },
      async ({ input, $ }) => {
        await $.agent({
          id: "run-core",
          agent: core,
          input: input.text,
        });
        return { result: "done" };
      },
    );

    await fa.generate({ input: { text: "hello" } });

    // Flow agent creates child({ flowAgentId: 'logger-flow' })
    expect(childCalls).toContainEqual({ flowAgentId: "logger-flow" });

    // $.agent() creates child({ stepId: 'run-core' }) for the step context
    expect(childCalls).toContainEqual({ stepId: "run-core" });

    // The sub-agent creates child({ agentId: 'core-agent' }) from the forwarded logger
    expect(childCalls).toContainEqual({ agentId: "core-agent" });
  });

  it("forwards scoped child logger through nested steps", async () => {
    const childCalls: Record<string, unknown>[] = [];

    function createTrackingLogger(): ReturnType<typeof createMockLogger> {
      const logger = createMockLogger();
      const originalChild = logger.child as ReturnType<typeof vi.fn>;
      originalChild.mockImplementation((bindings: Record<string, unknown>) => {
        childCalls.push(bindings);
        return createTrackingLogger();
      });
      return logger;
    }

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "nested-logger-flow",
        input: Input,
        output: Output,
        logger: createTrackingLogger(),
      },
      async ({ $: $outer, input }) => {
        await $outer.step({
          id: "outer",
          execute: async ({ $ }) => {
            await $.step({ id: "inner", execute: async () => "done" });
            return "ok";
          },
        });
        return { result: input.text };
      },
    );

    await fa.generate({ input: { text: "hello" } });

    expect(childCalls).toContainEqual({ flowAgentId: "nested-logger-flow" });
    expect(childCalls).toContainEqual({ stepId: "outer" });
    expect(childCalls).toContainEqual({ stepId: "inner" });
  });

  it("forwards ctx.signal to $.agent() sub-agent by default", async () => {
    let receivedSignal: AbortSignal | undefined;

    const spyAgent = agent({
      name: "spy-agent",
      model: createMockModel("ok"),
      logger: createMockLogger(),
    });

    const originalGenerate = spyAgent.generate.bind(spyAgent);
    spyAgent.generate = async (params) => {
      receivedSignal = params.signal;
      return originalGenerate(params);
    };

    const flowSignal = new AbortController().signal;

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "signal-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ $, input }) => {
        await $.agent({
          id: "spy",
          agent: spyAgent,
          input: input.text,
        });
        return { result: "done" };
      },
    );

    await fa.generate({ input: { text: "test" }, signal: flowSignal });

    // When no config.signal override, the flow's signal is forwarded
    expect(receivedSignal).toBe(flowSignal);
  });

  it("framework ctx.signal takes precedence over config.signal override on $.agent()", async () => {
    let receivedSignal: AbortSignal | undefined;

    const spyAgent = agent({
      name: "spy-agent",
      model: createMockModel("ok"),
      logger: createMockLogger(),
    });

    const originalGenerate = spyAgent.generate.bind(spyAgent);
    spyAgent.generate = async (params) => {
      receivedSignal = params.signal;
      return originalGenerate(params);
    };

    const flowSignal = new AbortController().signal;
    const overrideSignal = new AbortController().signal;

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "signal-override-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ $, input }) => {
        await $.agent({
          id: "spy",
          agent: spyAgent,
          input: input.text,
          config: { signal: overrideSignal },
        });
        return { result: "done" };
      },
    );

    await fa.generate({ input: { text: "test" }, signal: flowSignal });

    // Framework ctx.signal takes precedence over user-provided config.signal
    expect(receivedSignal).toBe(flowSignal);
  });

  it("config.config model override is forwarded to $.agent() sub-agent", async () => {
    const overrideModel = createMockModel("override output");
    const defaultModel = createMockModel("default output");

    const core = agent({
      name: "model-agent",
      model: defaultModel,
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "model-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ $, input }) => {
        const r = await $.agent({
          id: "run-core",
          agent: core,
          input: input.text,
          config: { model: overrideModel },
        });
        if (r.ok) {
          return { result: String(r.output) };
        }
        return { result: "failed" };
      },
    );

    const result = await fa.generate({ input: { text: "hello" } });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // The override model returns "override output"
    expect(result.output.result).toBe("override output");
  });

  it("per-call logger override on flowAgent.generate() is used instead of config logger", async () => {
    const configChildCalls: Record<string, unknown>[] = [];
    const overrideChildCalls: Record<string, unknown>[] = [];

    function createConfigLogger(): ReturnType<typeof createMockLogger> {
      const logger = createMockLogger();
      (logger.child as ReturnType<typeof vi.fn>).mockImplementation(
        (bindings: Record<string, unknown>) => {
          configChildCalls.push(bindings);
          return createConfigLogger();
        },
      );
      return logger;
    }

    function createOverrideLogger(): ReturnType<typeof createMockLogger> {
      const logger = createMockLogger();
      (logger.child as ReturnType<typeof vi.fn>).mockImplementation(
        (bindings: Record<string, unknown>) => {
          overrideChildCalls.push(bindings);
          return createOverrideLogger();
        },
      );
      return logger;
    }

    const fa = flowAgent<{ text: string }, { result: string }>(
      {
        name: "logger-override-flow",
        input: Input,
        output: Output,
        logger: createConfigLogger(),
      },
      async ({ $, input }) => {
        await $.step({ id: "work", execute: async () => "done" });
        return { result: input.text };
      },
    );

    await fa.generate({ input: { text: "test" }, logger: createOverrideLogger() });

    // Config logger should NOT be used
    expect(configChildCalls).toHaveLength(0);

    // Override logger should be used — creates child({ flowAgentId: ... })
    expect(overrideChildCalls).toContainEqual({ flowAgentId: "logger-override-flow" });
  });
});

// ---------------------------------------------------------------------------
// BuildAgentTool logger forwarding — agent subagents (not flow)
// ---------------------------------------------------------------------------

describe("Agent subagent logger forwarding (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards parent logger to sub-agents wrapped as tools", async () => {
    const childCalls: Record<string, unknown>[] = [];

    function createTrackingLogger(): ReturnType<typeof createMockLogger> {
      const logger = createMockLogger();
      (logger.child as ReturnType<typeof vi.fn>).mockImplementation(
        (bindings: Record<string, unknown>) => {
          childCalls.push(bindings);
          return createTrackingLogger();
        },
      );
      return logger;
    }

    const sub = agent({
      name: "sub-agent",
      model: createMockModel("sub response"),
      input: z.object({ task: z.string() }),
      prompt: ({ input }) => input.task,
    });

    // Mock model that makes a tool call on the first step, then stops
    const toolCallModel = new MockLanguageModelV3({
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues sync/async mismatch
      doGenerate: mockValues(
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "tc1",
              toolName: "agent_sub",
              input: JSON.stringify({ task: "do it" }),
            },
          ],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        {
          content: [{ type: "text" as const, text: "done" }],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, MockLanguageModelV3 expects PromiseLike
      ) as any,
    });

    const parent = agent({
      name: "parent-agent",
      model: toolCallModel,
      system: "You are a parent.",
      agents: { sub },
    });

    await parent.generate({
      prompt: "delegate this",
      logger: createTrackingLogger(),
    });

    // Parent creates child({ agentId: 'parent-agent' })
    expect(childCalls).toContainEqual({ agentId: "parent-agent" });

    // Sub-agent should receive the parent's logger and create child({ agentId: 'sub-agent' })
    // This verifies buildAgentTool forwards the logger
    expect(childCalls).toContainEqual({ agentId: "sub-agent" });
  });
});

// ---------------------------------------------------------------------------
// Agent subagent hook forwarding — parent hooks fire for sub-agent events
// ---------------------------------------------------------------------------

describe("Agent subagent hook forwarding (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parent onStepFinish fires for sub-agent internal steps", async () => {
    const stepEvents: string[] = [];

    const sub = agent({
      name: "sub-agent",
      model: createMockModel("sub response"),
      input: z.object({ task: z.string() }),
      prompt: ({ input }) => input.task,
    });

    const toolCallModel = new MockLanguageModelV3({
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues sync/async mismatch
      doGenerate: mockValues(
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "tc1",
              toolName: "agent_sub",
              input: JSON.stringify({ task: "do it" }),
            },
          ],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        {
          content: [{ type: "text" as const, text: "done" }],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, MockLanguageModelV3 expects PromiseLike
      ) as any,
    });

    const parent = agent({
      name: "parent-agent",
      model: toolCallModel,
      system: "Delegate to agent_sub.",
      agents: { sub },
      onStepFinish: (event) => {
        stepEvents.push(`config:${event.stepId}`);
      },
    });

    await parent.generate({
      prompt: "go",
      logger: createMockLogger(),
      onStepFinish: (event) => {
        stepEvents.push(`call:${event.stepId}`);
      },
    });

    // Parent's own step (the tool call round) fires parent hooks
    const parentSteps = stepEvents.filter((e) => e.includes("parent-agent"));
    expect(parentSteps.length).toBeGreaterThan(0);

    // Sub-agent's internal step fires parent hooks too (forwarded)
    const subSteps = stepEvents.filter((e) => e.includes("sub-agent"));
    expect(subSteps.length).toBeGreaterThan(0);

    // Config hook fires before per-call hook for sub-agent steps
    const subConfigIdx = stepEvents.findIndex((e) => e.startsWith("config:sub-agent"));
    const subCallIdx = stepEvents.findIndex((e) => e.startsWith("call:sub-agent"));
    if (subConfigIdx !== -1 && subCallIdx !== -1) {
      expect(subConfigIdx).toBeLessThan(subCallIdx);
    }
  });

  it("parent config and per-call onStepStart both fire for flow sub-agent steps", async () => {
    const stepEvents: string[] = [];

    const sub = flowAgent<{ task: string }, string>(
      {
        name: "sub-flow",
        input: z.object({ task: z.string() }),
        output: z.string(),
      },
      async ({ input, $ }) => {
        await $.step({ id: "work", execute: async () => input.task });
        return input.task;
      },
    );

    const toolCallModel = new MockLanguageModelV3({
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues sync/async mismatch
      doGenerate: mockValues(
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "tc1",
              toolName: "agent_sub",
              input: JSON.stringify({ task: "do it" }),
            },
          ],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        {
          content: [{ type: "text" as const, text: "done" }],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, MockLanguageModelV3 expects PromiseLike
      ) as any,
    });

    const parent = agent({
      name: "parent-agent",
      model: toolCallModel,
      system: "Delegate to agent_sub.",
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- FlowAgent satisfies Agent at runtime
      agents: { sub: sub as any },
      onStepStart: (event) => {
        stepEvents.push(`config:${event.stepId}`);
      },
    });

    await parent.generate({
      prompt: "go",
      logger: createMockLogger(),
      onStepStart: (event) => {
        stepEvents.push(`call:${event.stepId}`);
      },
    });

    // Sub-flow's step fires both config and per-call onStepStart from parent
    const subSteps = stepEvents.filter((e) => e.includes("work"));
    expect(subSteps.length).toBeGreaterThan(0);

    // Config hook fires before per-call hook
    const subConfigIdx = stepEvents.findIndex((e) => e.startsWith("config:") && e.includes("work"));
    const subCallIdx = stepEvents.findIndex((e) => e.startsWith("call:") && e.includes("work"));
    expect(subConfigIdx).not.toBe(-1);
    expect(subCallIdx).not.toBe(-1);
    expect(subConfigIdx).toBeLessThan(subCallIdx);
  });

  it("parent onStart does NOT fire for sub-agent events (type safety)", async () => {
    const startEvents: unknown[] = [];

    const sub = agent({
      name: "sub-agent",
      model: createMockModel("sub response"),
      input: z.object({ task: z.string() }),
      prompt: ({ input }) => input.task,
    });

    const toolCallModel = new MockLanguageModelV3({
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues sync/async mismatch
      doGenerate: mockValues(
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "tc1",
              toolName: "agent_sub",
              input: JSON.stringify({ task: "do it" }),
            },
          ],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        {
          content: [{ type: "text" as const, text: "done" }],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, MockLanguageModelV3 expects PromiseLike
      ) as any,
    });

    const parent = agent({
      name: "parent-agent",
      model: toolCallModel,
      system: "Delegate.",
      agents: { sub },
    });

    await parent.generate({
      prompt: "go",
      logger: createMockLogger(),
      onStart: (event) => {
        startEvents.push(event.input);
      },
    });

    // OnStart fires ONLY for the parent's own generate() call.
    // Generic hooks (onStart, onFinish, onError) are NOT forwarded to
    // Sub-agents because their event types are parameterized by
    // TInput/TOutput — forwarding would cause the parent's typed hook
    // To receive the sub-agent's differently-shaped event at runtime.
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0]).toBe("go");
  });

  it("parent onError does NOT fire for sub-agent errors (type safety)", async () => {
    const errorEvents: string[] = [];

    const failingModel = new MockLanguageModelV3({
      doGenerate: () => {
        throw new Error("sub-agent model failure");
      },
    });

    const sub = agent({
      name: "sub-agent",
      model: failingModel,
      input: z.object({ task: z.string() }),
      prompt: ({ input }) => input.task,
    });

    const toolCallModel = new MockLanguageModelV3({
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues sync/async mismatch
      doGenerate: mockValues({
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "tc1",
            toolName: "agent_sub",
            input: JSON.stringify({ task: "do it" }),
          },
        ],
        finishReason: MOCK_FINISH,
        usage: MOCK_USAGE,
        warnings: [],
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, MockLanguageModelV3 expects PromiseLike
      }) as any,
    });

    const parent = agent({
      name: "parent-agent",
      model: toolCallModel,
      system: "Delegate.",
      agents: { sub },
    });

    await parent.generate({
      prompt: "go",
      logger: createMockLogger(),
      onError: (event) => {
        errorEvents.push(event.error.message);
      },
    });

    // Generic hooks (onError) are NOT forwarded to sub-agents to
    // Preserve type safety. The sub-agent's tool execute() throws,
    // But the AI SDK treats tool errors as tool results — the parent
    // Never enters its own catch block for this, so onError does not fire.
    expect(errorEvents).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Step index uniqueness across nesting
// ---------------------------------------------------------------------------

describe("Step index uniqueness (integration)", () => {
  const Input = z.object({ n: z.number() });
  const Output = z.object({ count: z.number() });

  it("step IDs are globally unique across nested operations", async () => {
    const stepIds: string[] = [];

    const fa = flowAgent<{ n: number }, { count: number }>(
      {
        name: "index-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepStart: ({ stepId }) => {
          stepIds.push(stepId);
        },
      },
      async ({ input, $: $outer }) => {
        await $outer.step({
          id: "a",
          execute: async ({ $ }) => {
            await $.step({ id: "b", execute: async () => 1 });
            await $.step({ id: "c", execute: async () => 2 });
            return 0;
          },
        });
        await $outer.step({ id: "d", execute: async () => 3 });
        return { count: input.n };
      },
    );

    await fa.generate({ input: { n: 4 } });

    // All step IDs should be unique
    const uniqueIds = new Set(stepIds);
    expect(uniqueIds.size).toBe(stepIds.length);

    // Should match the step IDs in execution order
    expect(stepIds).toEqual(["a", "b", "c", "d"]);
  });
});

// ---------------------------------------------------------------------------
// Agent chain propagation
// ---------------------------------------------------------------------------

describe("Agent chain propagation (integration)", () => {
  const Input = z.object({ topic: z.string() });
  const Output = z.object({ summary: z.string() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flow agent step events carry agentChain with flow agent id", async () => {
    const chains: (readonly { id: string }[] | undefined)[] = [];

    const fa = flowAgent<{ topic: string }, { summary: string }>(
      {
        name: "my-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepFinish: (event) => {
          chains.push(event.agentChain);
        },
      },
      async ({ input, $ }) => {
        await $.step({ id: "work", execute: async () => input.topic });
        return { summary: input.topic };
      },
    );

    await fa.generate({ input: { topic: "test" } });

    expect(chains).toEqual([[{ id: "my-flow" }]]);
  });

  it("$.agent() sub-agent internal steps carry extended agentChain", async () => {
    const chains: (readonly { id: string }[] | undefined)[] = [];
    const stepIds: string[] = [];

    const writer = agent({
      name: "writer",
      model: createMockModel("written content"),
      logger: createMockLogger(),
    });

    const fa = flowAgent<{ topic: string }, { summary: string }>(
      {
        name: "pipeline",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepFinish: (event) => {
          const id = event.stepId;
          stepIds.push(id);
          chains.push(event.agentChain);
        },
      },
      async ({ input, $ }) => {
        const r = await $.agent({
          id: "write",
          agent: writer,
          input: `Write about ${input.topic}`,
        });
        if (r.ok) {
          return { summary: String(r.output) };
        }
        return { summary: "failed" };
      },
    );

    await fa.generate({ input: { topic: "TypeScript" } });

    // Sub-agent internal step carries extended chain
    expect(stepIds[0]).toBe("writer:0");
    expect(chains[0]).toEqual([{ id: "pipeline" }, { id: "writer" }]);

    // Flow-level $.agent() step carries the full chain (enriched from last AI step)
    expect(stepIds[1]).toBe("write");
    expect(chains[1]).toEqual([{ id: "pipeline" }, { id: "writer" }]);
  });

  it("base agent step events carry agentChain", async () => {
    const chains: (readonly { id: string }[] | undefined)[] = [];

    const myAgent = agent({
      name: "solo-agent",
      model: createMockModel("response"),
      logger: createMockLogger(),
    });

    await myAgent.generate({
      prompt: "hello",
      onStepFinish: (event) => {
        chains.push(event.agentChain);
      },
    });

    // Direct agent call: chain is just this agent
    expect(chains).toEqual([[{ id: "solo-agent" }]]);
  });

  it("agent chain cascades through agent → sub-agent tool calls", async () => {
    const stepEvents: {
      stepId: string | undefined;
      chain: readonly { id: string }[] | undefined;
    }[] = [];

    const sub = agent({
      name: "sub-agent",
      model: createMockModel("sub response"),
      input: z.object({ task: z.string() }),
      prompt: ({ input }) => input.task,
    });

    const toolCallModel = new MockLanguageModelV3({
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues sync/async mismatch
      doGenerate: mockValues(
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "tc1",
              toolName: "agent_sub",
              input: JSON.stringify({ task: "do it" }),
            },
          ],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        {
          content: [{ type: "text" as const, text: "done" }],
          finishReason: MOCK_FINISH,
          usage: MOCK_USAGE,
          warnings: [],
        },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- mockValues returns sync fn, MockLanguageModelV3 expects PromiseLike
      ) as any,
    });

    const parent = agent({
      name: "parent-agent",
      model: toolCallModel,
      system: "Delegate.",
      agents: { sub },
    });

    await parent.generate({
      prompt: "go",
      logger: createMockLogger(),
      onStepFinish: (event) => {
        stepEvents.push({ stepId: event.stepId, chain: event.agentChain });
      },
    });

    // Sub-agent internal step: chain = [parent, sub]
    const subEvents = stepEvents.filter((e) => e.stepId?.startsWith("sub-agent"));
    expect(subEvents.length).toBeGreaterThan(0);
    expect(subEvents[0]?.chain).toEqual([{ id: "parent-agent" }, { id: "sub-agent" }]);

    // Parent's own steps: chain = [parent]
    const parentEvents = stepEvents.filter((e) => e.stepId?.startsWith("parent-agent"));
    expect(parentEvents.length).toBeGreaterThan(0);
    expect(parentEvents[0]?.chain).toEqual([{ id: "parent-agent" }]);
  });
});
