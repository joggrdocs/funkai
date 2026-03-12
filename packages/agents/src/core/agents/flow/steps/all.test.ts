import { describe, expect, it, vi } from "vitest";

import { createStepBuilder } from "@/core/agents/flow/steps/factory.js";
import { createMockCtx } from "@/testing/index.js";

describe("all()", () => {
  it("resolves all entries concurrently", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.all({
      id: "all-entries",
      entries: [() => Promise.resolve("a"), () => Promise.resolve("b"), () => Promise.resolve("c")],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual(["a", "b", "c"]);
    expect(result.step.type).toBe("all");
  });

  it("fails fast on first error", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.all({
      id: "all-fail",
      entries: [
        () => Promise.resolve("a"),
        () => Promise.reject(new Error("fail")),
        () => Promise.resolve("c"),
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.message).toBe("fail");
    expect(result.error.stepId).toBe("all-fail");
  });

  it("passes abort signal to entry factories", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const receivedSignals: AbortSignal[] = [];

    await $.all({
      id: "all-signal",
      entries: [
        (signal) => {
          receivedSignals.push(signal);
          return Promise.resolve("a");
        },
        (signal) => {
          receivedSignals.push(signal);
          return Promise.resolve("b");
        },
      ],
    });

    expect(receivedSignals).toHaveLength(2);
    expect(receivedSignals[0]).toBeInstanceOf(AbortSignal);
    expect(receivedSignals[1]).toBeInstanceOf(AbortSignal);
  });

  it("aborts signal on error", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const signals: { entry: AbortSignal | undefined } = { entry: undefined };

    await $.all({
      id: "all-abort-on-err",
      entries: [
        () => Promise.reject(new Error("fail fast")),
        (signal) => {
          signals.entry = signal;
          return new Promise((r) => setTimeout(() => r("late"), 500));
        },
      ],
    });

    if (signals.entry === undefined) {
      throw new Error("Expected entry signal");
    }
    expect(signals.entry.aborted).toBe(true);
  });

  it("handles empty entries array", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.all({
      id: "all-empty",
      entries: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual([]);
  });

  it("handles single entry", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.all({
      id: "all-single",
      entries: [() => Promise.resolve(42)],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual([42]);
  });

  it("returns results in entry order", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.all({
      id: "all-order",
      entries: [
        () => new Promise((r) => setTimeout(() => r("slow"), 30)),
        () => Promise.resolve("fast"),
        () => new Promise((r) => setTimeout(() => r("medium"), 10)),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual(["slow", "fast", "medium"]);
  });

  it("propagates parent abort signal to child abort controller", async () => {
    const controller = new AbortController();
    const ctx = createMockCtx({ signal: controller.signal });
    const $ = createStepBuilder({ ctx });
    const signals: { entry: AbortSignal | undefined } = { entry: undefined };

    const result = await $.all({
      id: "all-parent-abort",
      entries: [
        (signal) => {
          signals.entry = signal;
          // Abort the parent after the factory captures the child signal
          controller.abort();
          return Promise.resolve("done");
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (signals.entry === undefined) {
      throw new Error("Expected entry signal");
    }
    expect(signals.entry.aborted).toBe(true);
  });

  it("fires onStart and onFinish hooks", async () => {
    const order: string[] = [];
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.all({
      id: "all-hooks",
      entries: [() => Promise.resolve("a")],
      onStart: () => {
        order.push("onStart");
      },
      onFinish: () => {
        order.push("onFinish");
      },
    });

    expect(order).toEqual(["onStart", "onFinish"]);
  });

  it("fires onError hook on failure", async () => {
    const onError = vi.fn();
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.all({
      id: "all-onerror",
      entries: [() => Promise.reject(new Error("all failure"))],
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "all-onerror",
        error: expect.any(Error),
      }),
    );
  });

  it("onFinish receives the results array", async () => {
    const onFinish = vi.fn();
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.all({
      id: "all-finish-result",
      entries: [() => Promise.resolve(1), () => Promise.resolve(2)],
      onFinish,
    });

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "all-finish-result",
        result: [1, 2],
        duration: expect.any(Number),
      }),
    );
  });

  it("records trace entry", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.all({
      id: "all-trace",
      entries: [() => Promise.resolve("traced")],
    });

    const traceEntry = ctx.trace[0];
    if (traceEntry === undefined) {
      throw new Error("Expected trace entry");
    }
    expect(traceEntry.id).toBe("all-trace");
    expect(traceEntry.type).toBe("all");
    expect(traceEntry.output).toEqual(["traced"]);
  });

  it("passes child $ to entry factories", async () => {
    const ctx = createMockCtx();
    const $$ = createStepBuilder({ ctx });

    await $$.all({
      id: "all-child-$",
      entries: [
        async (_signal, $) => {
          const inner = await $.step({
            id: "inner-from-all",
            execute: async () => "nested",
          });
          if (!inner.ok) {
            throw new Error("inner failed");
          }
          return inner.value;
        },
      ],
    });

    const traceEntry = ctx.trace[0];
    if (traceEntry === undefined) {
      throw new Error("Expected trace entry");
    }
    expect(traceEntry.children).toHaveLength(1);
    if (traceEntry.children === undefined) {
      throw new Error("Expected children");
    }
    const child = traceEntry.children[0];
    if (child === undefined) {
      throw new Error("Expected child entry");
    }
    expect(child.id).toBe("inner-from-all");
  });

  it("handles heterogeneous return types", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.all({
      id: "all-hetero",
      entries: [
        () => Promise.resolve("string"),
        () => Promise.resolve(42),
        () => Promise.resolve({ key: "value" }),
        () => Promise.resolve([1, 2, 3]),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual(["string", 42, { key: "value" }, [1, 2, 3]]);
  });
});
