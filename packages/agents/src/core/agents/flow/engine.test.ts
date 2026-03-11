import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createFlowEngine } from "@/core/agents/flow/engine.js";
import { createMockLogger } from "@/testing/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Input = z.object({ x: z.number() });
const Output = z.object({ y: z.number() });

function defaultConfig(overrides?: Record<string, unknown>) {
  return {
    name: "test-flow",
    input: Input,
    output: Output,
    logger: createMockLogger(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Engine with no custom steps (plain flow agent)
// ---------------------------------------------------------------------------

describe("createFlowEngine", () => {
  it("works as a plain flow agent when no custom steps are defined", async () => {
    const engine = createFlowEngine({});

    const fa = engine(defaultConfig(), async ({ input }) => ({ y: input.x * 2 }));

    const result = await fa.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ y: 10 });
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.trace).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Custom steps on $
  // ---------------------------------------------------------------------------

  describe("custom steps", () => {
    it("custom steps defined in $ are available on $ in the handler", async () => {
      const engine = createFlowEngine({
        $: {
          double: async ({ config }: { config: { value: number } }) => config.value * 2,
        },
      });

      const fa = engine(defaultConfig(), async ({ input, $ }) => {
        const doubled = await $.double({ value: input.x });
        return { y: doubled };
      });

      const result = await fa.generate({ x: 7 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toEqual({ y: 14 });
    });

    it("custom step factories receive correct ctx and config", async () => {
      const factorySpy = vi.fn(
        async ({
          ctx,
          config,
        }: {
          ctx: { signal: AbortSignal; log: unknown };
          config: { value: number };
        }) => {
          expect(ctx.signal).toBeDefined();
          expect(ctx.log).toBeDefined();
          return config.value + 1;
        },
      );

      const engine = createFlowEngine({
        $: {
          increment: factorySpy,
        },
      });

      const fa = engine(defaultConfig(), async ({ input, $ }) => {
        const result = await $.increment({ value: input.x });
        return { y: result };
      });

      await fa.generate({ x: 10 });

      expect(factorySpy).toHaveBeenCalledTimes(1);
      const firstCall = factorySpy.mock.calls[0];
      if (!firstCall) return;
      const call = firstCall[0];
      if (!call) return;
      expect(call.config).toEqual({ value: 10 });
      expect(call.ctx).toHaveProperty("signal");
      expect(call.ctx).toHaveProperty("log");
      expect(call.ctx).not.toHaveProperty("trace");
    });

    it("multiple custom steps work independently", async () => {
      const engine = createFlowEngine({
        $: {
          add: async ({ config }: { config: { a: number; b: number } }) => config.a + config.b,
          multiply: async ({ config }: { config: { a: number; b: number } }) => config.a * config.b,
        },
      });

      const SumProduct = z.object({ sum: z.number(), product: z.number() });
      const fa = engine(
        { name: "test-flow", input: Input, output: SumProduct, logger: createMockLogger() },
        async ({ input, $ }) => {
          const sum = await $.add({ a: input.x, b: 3 });
          const product = await $.multiply({ a: input.x, b: 3 });
          return { sum, product };
        },
      );

      const result = await fa.generate({ x: 4 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toEqual({ sum: 7, product: 12 });
    });

    it("built-in $ steps remain available alongside custom steps", async () => {
      const engine = createFlowEngine({
        $: {
          noop: async (_params: { config: undefined }) => "noop",
        },
      });

      const fa = engine(defaultConfig(), async ({ input, $ }) => {
        const stepResult = await $.step({
          id: "built-in",
          execute: async () => ({ v: input.x }),
        });

        await $.noop(undefined);

        if (!stepResult.ok) {
          return { y: 0 };
        }
        return { y: stepResult.value.v };
      });

      const result = await fa.generate({ x: 42 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toEqual({ y: 42 });
    });
  });

  // ---------------------------------------------------------------------------
  // Hook merging
  // ---------------------------------------------------------------------------

  describe("hook merging", () => {
    it("engine hooks fire before flow agent hooks (engine onStart -> flow onStart)", async () => {
      const order: string[] = [];

      const engine = createFlowEngine({
        onStart: () => {
          order.push("engine:onStart");
        },
        onFinish: () => {
          order.push("engine:onFinish");
        },
      });

      const fa = engine(
        defaultConfig({
          onStart: () => {
            order.push("flow:onStart");
          },
          onFinish: () => {
            order.push("flow:onFinish");
          },
        }),
        async ({ input }) => ({ y: input.x }),
      );

      await fa.generate({ x: 1 });

      expect(order).toEqual(["engine:onStart", "flow:onStart", "engine:onFinish", "flow:onFinish"]);
    });

    it("engine onError fires before flow agent onError", async () => {
      const order: string[] = [];

      const engine = createFlowEngine({
        onError: () => {
          order.push("engine:onError");
        },
      });

      const fa = engine(
        defaultConfig({
          onError: () => {
            order.push("flow:onError");
          },
        }),
        async () => {
          throw new Error("boom");
        },
      );

      const result = await fa.generate({ x: 1 });

      expect(result.ok).toBe(false);
      expect(order).toEqual(["engine:onError", "flow:onError"]);
    });

    it("engine onStepStart fires before flow agent onStepStart", async () => {
      const order: string[] = [];

      const engine = createFlowEngine({
        onStepStart: () => {
          order.push("engine:onStepStart");
        },
        onStepFinish: () => {
          order.push("engine:onStepFinish");
        },
      });

      const fa = engine(
        defaultConfig({
          onStepStart: () => {
            order.push("flow:onStepStart");
          },
          onStepFinish: () => {
            order.push("flow:onStepFinish");
          },
        }),
        async ({ $, input }) => {
          await $.step({
            id: "my-step",
            execute: async () => ({ v: 1 }),
          });
          return { y: input.x };
        },
      );

      await fa.generate({ x: 1 });

      expect(order).toEqual([
        "engine:onStepStart",
        "flow:onStepStart",
        "engine:onStepFinish",
        "flow:onStepFinish",
      ]);
    });

    it("if only engine has a hook (flow does not), it fires", async () => {
      const engineOnStart = vi.fn();
      const engineOnFinish = vi.fn();

      const engine = createFlowEngine({
        onStart: engineOnStart,
        onFinish: engineOnFinish,
      });

      const fa = engine(defaultConfig(), async ({ input }) => ({ y: input.x }));

      await fa.generate({ x: 5 });

      expect(engineOnStart).toHaveBeenCalledTimes(1);
      expect(engineOnFinish).toHaveBeenCalledTimes(1);
    });

    it("if only flow has a hook (engine does not), it fires", async () => {
      const flowOnStart = vi.fn();
      const flowOnFinish = vi.fn();

      const engine = createFlowEngine({});

      const fa = engine(
        defaultConfig({
          onStart: flowOnStart,
          onFinish: flowOnFinish,
        }),
        async ({ input }) => ({ y: input.x }),
      );

      await fa.generate({ x: 5 });

      expect(flowOnStart).toHaveBeenCalledTimes(1);
      expect(flowOnFinish).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Combined: custom steps + hooks
  // ---------------------------------------------------------------------------

  describe("custom steps with hooks", () => {
    it("custom steps work alongside hook merging", async () => {
      const order: string[] = [];

      const engine = createFlowEngine({
        $: {
          triple: async ({ config }: { config: { value: number } }) => {
            order.push("custom:execute");
            return config.value * 3;
          },
        },
        onStart: () => {
          order.push("engine:onStart");
        },
        onFinish: () => {
          order.push("engine:onFinish");
        },
      });

      const fa = engine(
        defaultConfig({
          onStart: () => {
            order.push("flow:onStart");
          },
          onFinish: () => {
            order.push("flow:onFinish");
          },
        }),
        async ({ input, $ }) => {
          const tripled = await $.triple({ value: input.x });
          return { y: tripled };
        },
      );

      const result = await fa.generate({ x: 3 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toEqual({ y: 9 });
      expect(order).toEqual([
        "engine:onStart",
        "flow:onStart",
        "custom:execute",
        "engine:onFinish",
        "flow:onFinish",
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns validation error for invalid input", async () => {
      const engine = createFlowEngine({});

      const fa = engine(defaultConfig(), async ({ input }) => ({ y: input.x }));

      const result = await fa.generate({ x: "not-a-number" } as unknown as { x: number });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("falls back to createDefaultLogger when logger is omitted from config", async () => {
      const engine = createFlowEngine({});

      const fa = engine(
        { name: "no-logger-flow", input: Input, output: Output },
        async ({ input }) => ({ y: input.x + 1 }),
      );

      const result = await fa.generate({ x: 10 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toEqual({ y: 11 });
    });

    it("returns FLOW_AGENT_ERROR when handler throws", async () => {
      const engine = createFlowEngine({});

      const fa = engine(defaultConfig(), async () => {
        throw new Error("handler failed");
      });

      const result = await fa.generate({ x: 1 });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("FLOW_AGENT_ERROR");
      expect(result.error.message).toBe("handler failed");
    });

    it("engine can create multiple independent flow agents", async () => {
      const engine = createFlowEngine({
        $: {
          add: async ({ config }: { config: { a: number; b: number } }) => config.a + config.b,
        },
      });

      const fa1 = engine({ ...defaultConfig(), name: "fa-1" }, async ({ input, $ }) => ({
        y: await $.add({ a: input.x, b: 1 }),
      }));

      const fa2 = engine({ ...defaultConfig(), name: "fa-2" }, async ({ input, $ }) => ({
        y: await $.add({ a: input.x, b: 100 }),
      }));

      const [r1, r2] = await Promise.all([fa1.generate({ x: 5 }), fa2.generate({ x: 5 })]);

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;
      expect(r1.output).toEqual({ y: 6 });
      expect(r2.output).toEqual({ y: 105 });
    });
  });

  // ---------------------------------------------------------------------------
  // Custom step name validation
  // ---------------------------------------------------------------------------

  describe("custom step name validation", () => {
    it("throws when a custom step name conflicts with a reserved name", () => {
      expect(() =>
        createFlowEngine({
          $: {
            step: async () => "conflict",
          },
        }),
      ).toThrow();
    });

    it("throws for each reserved name", () => {
      for (const reserved of ["step", "agent", "map", "each", "reduce", "while", "all", "race"]) {
        expect(
          () =>
            createFlowEngine({
              $: {
                [reserved]: async () => "conflict",
              },
            }),
          `Expected createFlowEngine to throw for reserved name "${reserved}"`,
        ).toThrow();
      }
    });
  });
});
