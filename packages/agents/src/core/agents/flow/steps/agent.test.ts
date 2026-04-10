import { match } from "ts-pattern";
import { describe, expect, it, vi } from "vitest";

import { createStepBuilder } from "@/core/agents/flow/steps/factory.js";
import type { Agent, BaseGenerateResult, GenerateResult } from "@/core/agents/types.js";
import { createMockCtx } from "@/testing/index.js";
import type { Result } from "@/utils/result.js";

const MOCK_USAGE = {
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  inputTokenDetails: {
    noCacheTokens: 100,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  },
  outputTokenDetails: {
    textTokens: 50,
    reasoningTokens: 0,
  },
};

function mockAgent(result: Result<Pick<BaseGenerateResult, "output">>): Agent<string> {
  const resolved: Result<GenerateResult> = match(result)
    .with({ ok: true }, (r) => ({ ...r, usage: MOCK_USAGE, finishReason: "stop" as const }))
    .otherwise((r) => r) as Result<GenerateResult>;
  return {
    generate: vi.fn<() => Promise<typeof resolved>>(async () => resolved),
    stream: vi.fn<() => Promise<never>>(),
    fn: vi.fn<() => void>(),
  } as unknown as Agent<string>;
}

describe("agent()", () => {
  it("unwraps successful agent result into StepResult", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({
      ok: true,
      output: "hello",
    });

    const result = await $.agent({ id: "ag", agent, input: "test" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("hello");
    expect(result.usage).toEqual(MOCK_USAGE);
    expect(result.finishReason).toBe("stop");
    expect(result.stepOperation).toBe("agent");
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
    const agent = mockAgent({ ok: true, output: "hi" });
    const config = { signal: new AbortController().signal };

    await $.agent({ id: "ag-cfg", agent, input: "hello", config });

    expect(agent.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "hello",
        signal: ctx.signal,
        logger: expect.any(Object),
      }),
    );
  });

  it("propagates ctx.signal to agent when no user signal is provided", async () => {
    const controller = new AbortController();
    const ctx = createMockCtx({ signal: controller.signal });
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi" });

    await $.agent({ id: "ag-ctx-signal", agent, input: "test" });

    expect(agent.generate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "test", signal: controller.signal }),
    );
  });

  it("framework ctx.signal takes precedence over user-provided config.signal", async () => {
    const ctxController = new AbortController();
    const userController = new AbortController();
    const ctx = createMockCtx({ signal: ctxController.signal });
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi" });

    await $.agent({
      id: "ag-user-signal",
      agent,
      input: "test",
      config: { signal: userController.signal },
    });

    expect(agent.generate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "test", signal: ctxController.signal }),
    );
  });

  it("records input in trace", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi" });

    await $.agent({ id: "ag-trace", agent, input: "my-input" });

    const [traceEntry] = ctx.trace;
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
    const agent = mockAgent({ ok: true, output: "done" });

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
    const onError = vi.fn<() => void>();
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
    const onFinish = vi.fn<() => void>();
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "result-text" });

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
        }),
        duration: expect.any(Number),
      }),
    );
  });

  it("passes scoped logger to agent.generate", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi" });

    await $.agent({ id: "ag-logger", agent, input: "test" });

    expect(agent.generate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "test", logger: expect.any(Object) }),
    );
    expect(ctx.log.child).toHaveBeenCalledWith({ stepId: "ag-logger" });
  });

  it("records usage on trace entry", async () => {
    const ctx = createMockCtx();
    const $ = createStepBuilder({ ctx });
    const agent = mockAgent({ ok: true, output: "hi" });

    await $.agent({ id: "ag-trace-usage", agent, input: "test" });

    const [traceEntry] = ctx.trace;
    if (traceEntry === undefined) {
      throw new Error("Expected trace entry");
    }
    expect(traceEntry.usage).toEqual(MOCK_USAGE);
  });
});
