import { describe, expect, it, vi } from "vitest";

import { createStepBuilder } from "@/core/agents/flow/steps/factory.js";
import { createMockCtx } from "@/testing/index.js";

describe("race()", () => {
  it("returns first resolved value", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.race({
      id: "race-first",
      entries: [
        () => new Promise((r) => setTimeout(() => r("slow"), 50)),
        () => Promise.resolve("fast"),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBe("fast");
    expect(result.step.type).toBe("race");
  });

  it("cancels losing entries via abort signal", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const signals: { loser: AbortSignal | undefined } = { loser: undefined };

    const result = await $.race({
      id: "race-cancel",
      entries: [
        () => Promise.resolve("winner"),
        (signal) => {
          signals.loser = signal;
          return new Promise((r) => setTimeout(() => r("loser"), 500));
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBe("winner");
    if (signals.loser === undefined) {
      throw new Error("Expected loser signal");
    }
    expect(signals.loser.aborted).toBe(true);
  });

  it("passes abort signal to all entry factories", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const receivedSignals: AbortSignal[] = [];

    await $.race({
      id: "race-signals",
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

  it("all entries share the same abort signal", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const receivedSignals: AbortSignal[] = [];

    await $.race({
      id: "race-shared-signal",
      entries: [
        (signal) => {
          receivedSignals.push(signal);
          return Promise.resolve("first");
        },
        (signal) => {
          receivedSignals.push(signal);
          return new Promise((r) => setTimeout(() => r("second"), 100));
        },
      ],
    });

    expect(receivedSignals).toHaveLength(2);
    expect(receivedSignals[0]).toBe(receivedSignals[1]);
  });

  it("returns ok: false when all entries reject", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.race({
      id: "race-all-fail",
      entries: [
        () => Promise.reject(new Error("fail-1")),
        () => Promise.reject(new Error("fail-2")),
      ],
    });

    // Promise.race rejects with the first rejection
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.stepId).toBe("race-all-fail");
  });

  it("handles single entry", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.race({
      id: "race-single",
      entries: [() => Promise.resolve("only")],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBe("only");
  });

  it("fires onStart and onFinish hooks", async () => {
    const order: string[] = [];
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.race({
      id: "race-hooks",
      entries: [() => Promise.resolve("done")],
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

    await $.race({
      id: "race-onerror",
      entries: [() => Promise.reject(new Error("race failure"))],
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "race-onerror",
        error: expect.any(Error),
      }),
    );
  });

  it("onFinish receives the winner result", async () => {
    const onFinish = vi.fn();
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.race({
      id: "race-finish",
      entries: [() => Promise.resolve("winner")],
      onFinish,
    });

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "race-finish",
        result: "winner",
        duration: expect.any(Number),
      }),
    );
  });

  it("records trace entry", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    await $.race({
      id: "race-trace",
      entries: [() => Promise.resolve("traced")],
    });

    const traceEntry = ctx.trace[0];
    if (traceEntry === undefined) {
      throw new Error("Expected trace entry");
    }
    expect(traceEntry.id).toBe("race-trace");
    expect(traceEntry.type).toBe("race");
    expect(traceEntry.output).toBe("traced");
  });

  it("passes child $ to entry factories", async () => {
    const ctx = createMockCtx();
    const $$ = createStepBuilder({ ctx });

    await $$.race({
      id: "race-child-$",
      entries: [
        async (_signal, $) => {
          const inner = await $.step({
            id: "inner-from-race",
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
    expect(child.id).toBe("inner-from-race");
  });

  it("aborts signal on error too (finally block)", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const signals: { entry: AbortSignal | undefined } = { entry: undefined };

    await $.race({
      id: "race-abort-on-err",
      entries: [
        () => Promise.reject(new Error("fail")),
        (signal) => {
          signals.entry = signal;
          return new Promise((r) => setTimeout(() => r("late"), 500));
        },
      ],
    });

    // The finally block in race() always aborts
    if (signals.entry !== undefined) {
      expect(signals.entry.aborted).toBe(true);
    }
  });

  it("winner resolves before losers complete", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });

    const result = await $.race({
      id: "race-timing",
      entries: [
        () => new Promise((r) => setTimeout(() => r("slow-1"), 100)),
        () => new Promise((r) => setTimeout(() => r("slow-2"), 200)),
        () => Promise.resolve("instant"),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBe("instant");
  });
});
