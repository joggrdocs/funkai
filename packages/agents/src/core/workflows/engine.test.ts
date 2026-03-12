import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createWorkflowEngine } from "@/core/workflows/engine.js";
import { createMockLogger } from "@/testing/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Input = z.object({ x: z.number() });
const Output = z.object({ y: z.number() });

function defaultConfig(overrides?: Record<string, unknown>) {
  return {
    name: "test-workflow",
    input: Input,
    output: Output,
    logger: createMockLogger(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Engine with no custom steps (plain workflow)
// ---------------------------------------------------------------------------

describe("createWorkflowEngine", () => {
  it("works as a plain workflow when no custom steps are defined", async () => {
    const engine = createWorkflowEngine({});

    const workflow = engine(defaultConfig(), async ({ input }) => ({ y: input.x * 2 }));

    const result = await workflow.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: 10 });
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.trace).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Custom steps on $
  // ---------------------------------------------------------------------------

  describe("custom steps", () => {
    it("custom steps defined in $ are available on $ in the handler", async () => {
      const engine = createWorkflowEngine({
        $: {
          double: async ({ config }: { config: { value: number } }) => config.value * 2,
        },
      });

      const workflow = engine(defaultConfig(), async ({ input, $ }) => {
        const doubled = await $.double({ value: input.x });
        return { y: doubled };
      });

      const result = await workflow.generate({ x: 7 });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
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
          // ctx should have signal and log (but not trace)
          expect(ctx.signal).toBeDefined();
          expect(ctx.log).toBeDefined();
          return config.value + 1;
        },
      );

      const engine = createWorkflowEngine({
        $: {
          increment: factorySpy,
        },
      });

      const workflow = engine(defaultConfig(), async ({ input, $ }) => {
        const result = await $.increment({ value: input.x });
        return { y: result };
      });

      await workflow.generate({ x: 10 });

      expect(factorySpy).toHaveBeenCalledTimes(1);
      const firstCall = factorySpy.mock.calls[0];
      if (!firstCall) {
        return;
      }
      const call = firstCall[0];
      if (!call) {
        return;
      }
      expect(call.config).toEqual({ value: 10 });
      expect(call.ctx).toHaveProperty("signal");
      expect(call.ctx).toHaveProperty("log");
      expect(call.ctx).not.toHaveProperty("trace");
    });

    it("multiple custom steps work independently", async () => {
      const engine = createWorkflowEngine({
        $: {
          add: async ({ config }: { config: { a: number; b: number } }) => config.a + config.b,
          multiply: async ({ config }: { config: { a: number; b: number } }) => config.a * config.b,
        },
      });

      const SumProduct = z.object({ sum: z.number(), product: z.number() });
      const workflow = engine(
        { name: "test-workflow", input: Input, output: SumProduct, logger: createMockLogger() },
        async ({ input, $ }) => {
          const sum = await $.add({ a: input.x, b: 3 });
          const product = await $.multiply({ a: input.x, b: 3 });
          return { sum, product };
        },
      );

      const result = await workflow.generate({ x: 4 });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.output).toEqual({ sum: 7, product: 12 });
    });

    it("custom steps can use ctx.log for scoped logging", async () => {
      const debugCalls: unknown[] = [];

      const engine = createWorkflowEngine({
        $: {
          loggedStep: async ({
            ctx,
            config,
          }: {
            ctx: import("@/lib/context.js").ExecutionContext;
            config: { msg: string };
          }) => {
            ctx.log.debug("custom step running", { msg: config.msg });
            debugCalls.push(config.msg);
            return 42;
          },
        },
      });

      const workflow = engine(defaultConfig(), async ({ $ }) => {
        await $.loggedStep({ msg: "hello" });
        return { y: 42 };
      });

      await workflow.generate({ x: 1 });

      expect(debugCalls).toEqual(["hello"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Hook merging
  // ---------------------------------------------------------------------------

  describe("hook merging", () => {
    it("engine hooks fire before workflow hooks (engine onStart -> workflow onStart)", async () => {
      const order: string[] = [];

      const engine = createWorkflowEngine({
        onStart: () => {
          order.push("engine:onStart");
        },
        onFinish: () => {
          order.push("engine:onFinish");
        },
      });

      const workflow = engine(
        defaultConfig({
          onStart: () => {
            order.push("workflow:onStart");
          },
          onFinish: () => {
            order.push("workflow:onFinish");
          },
        }),
        async ({ input }) => ({ y: input.x }),
      );

      await workflow.generate({ x: 1 });

      expect(order).toEqual([
        "engine:onStart",
        "workflow:onStart",
        "engine:onFinish",
        "workflow:onFinish",
      ]);
    });

    it("engine onError fires before workflow onError", async () => {
      const order: string[] = [];

      const engine = createWorkflowEngine({
        onError: () => {
          order.push("engine:onError");
        },
      });

      const workflow = engine(
        defaultConfig({
          onError: () => {
            order.push("workflow:onError");
          },
        }),
        async () => {
          throw new Error("boom");
        },
      );

      const result = await workflow.generate({ x: 1 });

      expect(result.ok).toBe(false);
      expect(order).toEqual(["engine:onError", "workflow:onError"]);
    });

    it("engine onStepStart fires before workflow onStepStart", async () => {
      const order: string[] = [];

      const engine = createWorkflowEngine({
        onStepStart: () => {
          order.push("engine:onStepStart");
        },
        onStepFinish: () => {
          order.push("engine:onStepFinish");
        },
      });

      const workflow = engine(
        defaultConfig({
          onStepStart: () => {
            order.push("workflow:onStepStart");
          },
          onStepFinish: () => {
            order.push("workflow:onStepFinish");
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

      await workflow.generate({ x: 1 });

      expect(order).toEqual([
        "engine:onStepStart",
        "workflow:onStepStart",
        "engine:onStepFinish",
        "workflow:onStepFinish",
      ]);
    });

    it("if only engine has a hook (workflow does not), it fires", async () => {
      const engineOnStart = vi.fn();
      const engineOnFinish = vi.fn();

      const engine = createWorkflowEngine({
        onStart: engineOnStart,
        onFinish: engineOnFinish,
      });

      const workflow = engine(defaultConfig(), async ({ input }) => ({ y: input.x }));

      await workflow.generate({ x: 5 });

      expect(engineOnStart).toHaveBeenCalledTimes(1);
      expect(engineOnFinish).toHaveBeenCalledTimes(1);
    });

    it("if only workflow has a hook (engine does not), it fires", async () => {
      const workflowOnStart = vi.fn();
      const workflowOnFinish = vi.fn();

      const engine = createWorkflowEngine({});

      const workflow = engine(
        defaultConfig({
          onStart: workflowOnStart,
          onFinish: workflowOnFinish,
        }),
        async ({ input }) => ({ y: input.x }),
      );

      await workflow.generate({ x: 5 });

      expect(workflowOnStart).toHaveBeenCalledTimes(1);
      expect(workflowOnFinish).toHaveBeenCalledTimes(1);
    });

    it("engine-only onError fires when workflow has no onError", async () => {
      const engineOnError = vi.fn();

      const engine = createWorkflowEngine({
        onError: engineOnError,
      });

      const workflow = engine(defaultConfig(), async () => {
        throw new Error("engine-only error");
      });

      await workflow.generate({ x: 1 });

      expect(engineOnError).toHaveBeenCalledTimes(1);
    });

    it("workflow-only onError fires when engine has no onError", async () => {
      const workflowOnError = vi.fn();

      const engine = createWorkflowEngine({});

      const workflow = engine(
        defaultConfig({
          onError: workflowOnError,
        }),
        async () => {
          throw new Error("workflow-only error");
        },
      );

      await workflow.generate({ x: 1 });

      expect(workflowOnError).toHaveBeenCalledTimes(1);
    });

    it("engine-only step hooks fire when workflow has no step hooks", async () => {
      const engineOnStepStart = vi.fn();
      const engineOnStepFinish = vi.fn();

      const engine = createWorkflowEngine({
        onStepStart: engineOnStepStart,
        onStepFinish: engineOnStepFinish,
      });

      const workflow = engine(defaultConfig(), async ({ $, input }) => {
        await $.step({ id: "s", execute: async () => ({}) });
        return { y: input.x };
      });

      await workflow.generate({ x: 1 });

      expect(engineOnStepStart).toHaveBeenCalledTimes(1);
      expect(engineOnStepFinish).toHaveBeenCalledTimes(1);
    });

    it("workflow-only step hooks fire when engine has no step hooks", async () => {
      const workflowOnStepStart = vi.fn();
      const workflowOnStepFinish = vi.fn();

      const engine = createWorkflowEngine({});

      const workflow = engine(
        defaultConfig({
          onStepStart: workflowOnStepStart,
          onStepFinish: workflowOnStepFinish,
        }),
        async ({ $, input }) => {
          await $.step({ id: "s", execute: async () => ({}) });
          return { y: input.x };
        },
      );

      await workflow.generate({ x: 1 });

      expect(workflowOnStepStart).toHaveBeenCalledTimes(1);
      expect(workflowOnStepFinish).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Combined: custom steps + hooks
  // ---------------------------------------------------------------------------

  describe("custom steps with hooks", () => {
    it("custom steps work alongside hook merging", async () => {
      const order: string[] = [];

      const engine = createWorkflowEngine({
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

      const workflow = engine(
        defaultConfig({
          onStart: () => {
            order.push("workflow:onStart");
          },
          onFinish: () => {
            order.push("workflow:onFinish");
          },
        }),
        async ({ input, $ }) => {
          const tripled = await $.triple({ value: input.x });
          return { y: tripled };
        },
      );

      const result = await workflow.generate({ x: 3 });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.output).toEqual({ y: 9 });
      expect(order).toEqual([
        "engine:onStart",
        "workflow:onStart",
        "custom:execute",
        "engine:onFinish",
        "workflow:onFinish",
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns validation error for invalid input", async () => {
      const engine = createWorkflowEngine({});

      const workflow = engine(defaultConfig(), async ({ input }) => ({ y: input.x }));

      const result = await workflow.generate({ x: "not-a-number" } as unknown as { x: number });

      expect(result.ok).toBe(false);
      if (result.ok) {
        return;
      }
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns workflow error when handler throws", async () => {
      const engine = createWorkflowEngine({});

      const workflow = engine(defaultConfig(), async () => {
        throw new Error("handler failed");
      });

      const result = await workflow.generate({ x: 1 });

      expect(result.ok).toBe(false);
      if (result.ok) {
        return;
      }
      expect(result.error.code).toBe("WORKFLOW_ERROR");
      expect(result.error.message).toBe("handler failed");
    });

    it("built-in $ steps remain available alongside custom steps", async () => {
      const engine = createWorkflowEngine({
        $: {
          noop: async (_params: { config: undefined }) => "noop",
        },
      });

      const workflow = engine(defaultConfig(), async ({ input, $ }) => {
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

      const result = await workflow.generate({ x: 42 });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.output).toEqual({ y: 42 });
    });

    it("engine can create multiple independent workflows", async () => {
      const engine = createWorkflowEngine({
        $: {
          add: async ({ config }: { config: { a: number; b: number } }) => config.a + config.b,
        },
      });

      const workflow1 = engine({ ...defaultConfig(), name: "wf-1" }, async ({ input, $ }) => ({
        y: await $.add({ a: input.x, b: 1 }),
      }));

      const workflow2 = engine({ ...defaultConfig(), name: "wf-2" }, async ({ input, $ }) => ({
        y: await $.add({ a: input.x, b: 100 }),
      }));

      const [r1, r2] = await Promise.all([
        workflow1.generate({ x: 5 }),
        workflow2.generate({ x: 5 }),
      ]);

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) {
        return;
      }
      expect(r1.output).toEqual({ y: 6 });
      expect(r2.output).toEqual({ y: 105 });
    });
  });
});
