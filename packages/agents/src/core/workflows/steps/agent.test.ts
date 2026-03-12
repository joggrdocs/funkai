import { match } from "ts-pattern";
import { describe, expect, it, vi } from "vitest";

import type { Agent, GenerateResult } from "@/core/agent/types.js";
import { createStepBuilder } from "@/core/workflows/steps/factory.js";
import { createMockCtx } from "@/testing/index.js";
import type { Result } from "@/utils/result.js";

const MOCK_USAGE = {
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
};

function mockAgent(result: Result<Pick<GenerateResult, "output" | "messages">>): Agent<string> {
  const resolved: Result<GenerateResult> = match(result)
    .with({ ok: true }, (r) => ({ ...r, usage: MOCK_USAGE, finishReason: "stop" as const }))
    .otherwise((r) => r);
  return {
    generate: vi.fn(async () => resolved),
    stream: vi.fn(),
    fn: vi.fn(),
  } as unknown as Agent<string>;
}

describe("agent()", () => {
  it("unwraps successful agent result into StepResult", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({
      ok: true,
      output: "hello",
      messages: [],
    });

    const result = await $.agent({ id: "ag", agent, input: "test" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.output).toBe("hello");
    expect(result.value.messages).toEqual([]);
    expect(result.value.usage).toEqual(MOCK_USAGE);
    expect(result.value.finishReason).toBe("stop");
    expect(result.step.type).toBe("agent");
  });

  it("converts agent error result into StepError", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({
      ok: false,
      error: { code: "AGENT_ERROR", message: "agent failed", cause: new Error("root") },
    });

    const result = await $.agent({ id: "ag-err", agent, input: "test" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("STEP_ERROR");
    expect(result.error.stepId).toBe("ag-err");
  });

  it("throws the cause error from agent error result", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const rootCause = new Error("root cause");
    const agent = mockAgent({
      ok: false,
      error: { code: "AGENT_ERROR", message: "agent failed", cause: rootCause },
    });

    const result = await $.agent({ id: "ag-cause", agent, input: "test" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.cause).toBe(rootCause);
  });

  it("creates new Error from message when no cause is provided", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({
      ok: false,
      error: { code: "AGENT_ERROR", message: "no cause" },
    });

    const result = await $.agent({ id: "ag-no-cause", agent, input: "test" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.message).toBe("no cause");
  });

  it("calls agent.generate with input and config", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });
    const config = { signal: new AbortController().signal };

    await $.agent({ id: "ag-cfg", agent, input: "hello", config });

    expect(agent.generate).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({ signal: config.signal, logger: expect.any(Object) }),
    );
  });

  it("propagates ctx.signal to agent when no user signal is provided", async () => {
    const controller = new AbortController();
    const ctx = createMockCtx({ signal: controller.signal });
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });

    await $.agent({ id: "ag-ctx-signal", agent, input: "test" });

    expect(agent.generate).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("user-provided config.signal takes precedence over ctx.signal", async () => {
    const ctxController = new AbortController();
    const userController = new AbortController();
    const ctx = createMockCtx({ signal: ctxController.signal });
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });

    await $.agent({
      id: "ag-user-signal",
      agent,
      input: "test",
      config: { signal: userController.signal },
    });

    expect(agent.generate).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ signal: userController.signal }),
    );
  });

  it("records input in trace", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });

    await $.agent({ id: "ag-trace", agent, input: "my-input" });

    const traceEntry = ctx.trace[0];
    if (traceEntry === undefined) {
      throw new Error("Expected trace entry");
    }
    expect(traceEntry.input).toBe("my-input");
    expect(traceEntry.type).toBe("agent");
  });

  it("fires onStart and onFinish hooks", async () => {
    const order: string[] = [];
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "done", messages: [] });

    await $.agent({
      id: "ag-hooks",
      agent,
      input: "test",
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
    const agent = mockAgent({
      ok: false,
      error: { code: "AGENT_ERROR", message: "failed" },
    });

    await $.agent({
      id: "ag-onerror",
      agent,
      input: "test",
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ag-onerror",
        error: expect.any(Error),
      }),
    );
  });

  it("onFinish receives the GenerateResult", async () => {
    const onFinish = vi.fn();
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "result-text", messages: [] });

    await $.agent({
      id: "ag-finish-result",
      agent,
      input: "test",
      onFinish,
    });

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ag-finish-result",
        result: expect.objectContaining({
          output: "result-text",
          messages: [],
        }),
        duration: expect.any(Number),
      }),
    );
  });

  it("emits step events", async () => {
    const events: Array<{ type: string }> = [];
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx, emit: (e) => events.push(e) });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });

    await $.agent({ id: "ag-emit", agent, input: "test" });

    expect(events).toHaveLength(2);
    const startEvent = events[0];
    if (startEvent === undefined) {
      throw new Error("Expected start event");
    }
    const finishEvent = events[1];
    if (finishEvent === undefined) {
      throw new Error("Expected finish event");
    }
    expect(startEvent.type).toBe("step:start");
    expect(finishEvent.type).toBe("step:finish");
  });

  it("emits step:error on agent failure", async () => {
    const events: Array<{ type: string }> = [];
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx, emit: (e) => events.push(e) });
    const agent = mockAgent({
      ok: false,
      error: { code: "AGENT_ERROR", message: "fail" },
    });

    await $.agent({ id: "ag-emit-err", agent, input: "test" });

    const errorEvent = events[1];
    if (errorEvent === undefined) {
      throw new Error("Expected error event");
    }
    expect(errorEvent.type).toBe("step:error");
  });

  it("passes scoped logger to agent.generate", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });

    await $.agent({ id: "ag-logger", agent, input: "test" });

    expect(agent.generate).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ logger: expect.any(Object) }),
    );
    expect(ctx.log.child).toHaveBeenCalledWith({ stepId: "ag-logger" });
  });

  it("handles agent returning empty messages array", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "text", messages: [] });

    const result = await $.agent({ id: "ag-empty-msgs", agent, input: "test" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.messages).toEqual([]);
  });

  it("records usage on trace entry", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi", messages: [] });

    await $.agent({ id: "ag-trace-usage", agent, input: "test" });

    const traceEntry = ctx.trace[0];
    if (traceEntry === undefined) {
      throw new Error("Expected trace entry");
    }
    expect(traceEntry.usage).toEqual(MOCK_USAGE);
  });
});
