import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";
import { createMockLogger } from "@/testing/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Input = z.object({ x: z.number() });
const Output = z.object({ y: z.number() });

function createSimpleFlowAgent(
  overrides?: Partial<Parameters<typeof flowAgent<{ x: number }, { y: number }>>[0]>,
  handler?: Parameters<typeof flowAgent<{ x: number }, { y: number }>>[1],
) {
  return flowAgent<{ x: number }, { y: number }>(
    {
      name: "test-flow",
      input: Input,
      output: Output,
      logger: createMockLogger(),
      ...overrides,
    },
    handler ?? (async ({ input }) => ({ y: input.x * 2 })),
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// FlowAgent creation
// ---------------------------------------------------------------------------

describe("flowAgent creation", () => {
  it("returns an object with generate, stream, and fn methods", () => {
    const fa = createSimpleFlowAgent();

    expect(typeof fa.generate).toBe("function");
    expect(typeof fa.stream).toBe("function");
    expect(typeof fa.fn).toBe("function");
  });

  it("attaches RUNNABLE_META with name and inputSchema", () => {
    const fa = createSimpleFlowAgent();
    // eslint-disable-next-line security/detect-object-injection
    const meta = (fa as unknown as Record<symbol, unknown>)[RUNNABLE_META] as RunnableMeta;

    expect(meta.name).toBe("test-flow");
    expect(meta.inputSchema).toBe(Input);
  });
});

// ---------------------------------------------------------------------------
// generate() — success path
// ---------------------------------------------------------------------------

describe("generate() success", () => {
  it("returns ok: true with computed output", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ y: 10 });
  });

  it("includes messages array with user and assistant messages", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 3 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.messages[0]?.role).toBe("user");
    expect(result.messages[result.messages.length - 1]?.role).toBe("assistant");
  });

  it("includes usage with zero-valued fields when no sub-agents run", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    });
  });

  it("includes finishReason of stop", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finishReason).toBe("stop");
  });

  it("includes trace array", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace).toBeInstanceOf(Array);
  });

  it("includes duration >= 0", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// generate() — with steps
// ---------------------------------------------------------------------------

describe("generate() with steps", () => {
  it("handler receives $ step builder and can use $.step()", async () => {
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "step-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ input, $ }) => {
        const result = await $.step({
          id: "double",
          execute: async () => input.x * 2,
        });

        return { y: result.ok ? result.value : 0 };
      },
    );

    const result = await fa.generate({ x: 7 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ y: 14 });
  });

  it("steps produce synthetic tool-call messages in the messages array", async () => {
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "msg-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ input, $ }) => {
        await $.step({
          id: "compute",
          execute: async () => input.x + 1,
        });

        return { y: input.x + 1 };
      },
    );

    const result = await fa.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should have: user msg, tool-call msg, tool-result msg, assistant msg
    expect(result.messages.length).toBeGreaterThanOrEqual(4);

    const toolCallMsg = result.messages.find(
      (m) =>
        m.role === "assistant" &&
        Array.isArray(m.content) &&
        (m.content as Array<{ type: string }>).some((p) => p.type === "tool-call"),
    );
    expect(toolCallMsg).toBeDefined();

    const toolResultMsg = result.messages.find(
      (m) =>
        m.role === "tool" &&
        Array.isArray(m.content) &&
        (m.content as Array<{ type: string }>).some((p) => p.type === "tool-result"),
    );
    expect(toolResultMsg).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// generate() — input validation
// ---------------------------------------------------------------------------

describe("generate() input validation", () => {
  it("returns VALIDATION_ERROR when input fails safeParse", async () => {
    const fa = createSimpleFlowAgent();

    // @ts-expect-error - intentionally invalid input
    const result = await fa.generate({ x: "not-a-number" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Input validation failed");
  });

  it("returns VALIDATION_ERROR when required fields are missing", async () => {
    const fa = createSimpleFlowAgent();

    // @ts-expect-error - intentionally missing field
    const result = await fa.generate({});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not call handler when input validation fails", async () => {
    const handler = vi.fn(async ({ input }: { input: { x: number } }) => ({ y: input.x }));
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "test",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      handler as never,
    );

    // @ts-expect-error - intentionally invalid input
    await fa.generate({ x: "bad" });

    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// generate() — output validation
// ---------------------------------------------------------------------------

describe("generate() output validation", () => {
  it("returns VALIDATION_ERROR when output fails safeParse", async () => {
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "test",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async () => ({ y: "not-a-number" }) as unknown as { y: number },
    );

    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Output validation failed");
  });
});

// ---------------------------------------------------------------------------
// generate() — error handling
// ---------------------------------------------------------------------------

describe("generate() error handling", () => {
  it("returns FLOW_AGENT_ERROR when handler throws an Error", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("handler exploded");
    });

    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FLOW_AGENT_ERROR");
    expect(result.error.message).toBe("handler exploded");
    expect(result.error.cause).toBeInstanceOf(Error);
  });

  it("wraps non-Error throws into Error with FLOW_AGENT_ERROR code", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw "string error";
    });

    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FLOW_AGENT_ERROR");
    expect(result.error.message).toBe("string error");
  });
});

// ---------------------------------------------------------------------------
// generate() — hooks
// ---------------------------------------------------------------------------

describe("generate() hooks", () => {
  it("fires onStart hook with input", async () => {
    const onStart = vi.fn();
    const fa = createSimpleFlowAgent({ onStart });
    await fa.generate({ x: 5 });

    expect(onStart).toHaveBeenCalledTimes(1);
    const firstCall = onStart.mock.calls[0];
    if (!firstCall) throw new Error("Expected onStart first call");
    expect(firstCall[0]).toEqual({ input: { x: 5 } });
  });

  it("fires onFinish hook with input, result, and duration", async () => {
    const onFinish = vi.fn();
    const fa = createSimpleFlowAgent({ onFinish });
    await fa.generate({ x: 3 });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const firstCall = onFinish.mock.calls[0];
    if (!firstCall) throw new Error("Expected onFinish first call");
    const event = firstCall[0];
    expect(event.input).toEqual({ x: 3 });
    expect(event.result).toHaveProperty("output");
    expect(event.result).toHaveProperty("messages");
    expect(event.result).toHaveProperty("usage");
    expect(event.duration).toBeGreaterThanOrEqual(0);
  });

  it("fires onError hook when handler throws", async () => {
    const onError = vi.fn();
    const fa = createSimpleFlowAgent({ onError }, async () => {
      throw new Error("boom");
    });
    await fa.generate({ x: 1 });

    expect(onError).toHaveBeenCalledTimes(1);
    const firstCall = onError.mock.calls[0];
    if (!firstCall) throw new Error("Expected onError first call");
    expect(firstCall[0].input).toEqual({ x: 1 });
    expect(firstCall[0].error).toBeInstanceOf(Error);
    expect(firstCall[0].error.message).toBe("boom");
  });

  it("fires both config and override onStart hooks", async () => {
    const configOnStart = vi.fn();
    const overrideOnStart = vi.fn();

    const fa = createSimpleFlowAgent({ onStart: configOnStart });
    await fa.generate({ x: 1 }, { onStart: overrideOnStart });

    expect(configOnStart).toHaveBeenCalledTimes(1);
    expect(overrideOnStart).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onFinish hooks", async () => {
    const configOnFinish = vi.fn();
    const overrideOnFinish = vi.fn();

    const fa = createSimpleFlowAgent({ onFinish: configOnFinish });
    await fa.generate({ x: 1 }, { onFinish: overrideOnFinish });

    expect(configOnFinish).toHaveBeenCalledTimes(1);
    expect(overrideOnFinish).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onError hooks", async () => {
    const configOnError = vi.fn();
    const overrideOnError = vi.fn();

    const fa = createSimpleFlowAgent({ onError: configOnError }, async () => {
      throw new Error("fail");
    });
    await fa.generate({ x: 1 }, { onError: overrideOnError });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(overrideOnError).toHaveBeenCalledTimes(1);
  });

  it("does not fire onFinish when handler throws", async () => {
    const onFinish = vi.fn();

    const fa = createSimpleFlowAgent({ onFinish }, async () => {
      throw new Error("fail");
    });
    await fa.generate({ x: 1 });

    expect(onFinish).not.toHaveBeenCalled();
  });

  it("does not fire onError on input validation failure", async () => {
    const onError = vi.fn();
    const fa = createSimpleFlowAgent({ onError });

    // @ts-expect-error - intentionally invalid input
    await fa.generate({ x: "bad" });

    expect(onError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// generate() — hook resilience
// ---------------------------------------------------------------------------

describe("generate() hook resilience", () => {
  it("onStart throwing does not prevent execution", async () => {
    const fa = createSimpleFlowAgent({
      onStart: () => {
        throw new Error("onStart boom");
      },
    });

    const result = await fa.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ y: 10 });
  });

  it("onFinish throwing does not break the result", async () => {
    const fa = createSimpleFlowAgent({
      onFinish: () => {
        throw new Error("onFinish boom");
      },
    });

    const result = await fa.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ y: 10 });
  });

  it("onError throwing does not break the error result", async () => {
    const fa = createSimpleFlowAgent(
      {
        onError: () => {
          throw new Error("onError boom");
        },
      },
      async () => {
        throw new Error("handler fail");
      },
    );

    const result = await fa.generate({ x: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FLOW_AGENT_ERROR");
    expect(result.error.message).toBe("handler fail");
  });
});

// ---------------------------------------------------------------------------
// generate() — overrides
// ---------------------------------------------------------------------------

describe("generate() overrides", () => {
  it("uses override signal when provided", async () => {
    const controller = new AbortController();
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 1 }, { signal: controller.signal });

    expect(result.ok).toBe(true);
  });

  it("uses override logger when provided", async () => {
    const overrideLogger = createMockLogger();
    const fa = createSimpleFlowAgent();
    await fa.generate({ x: 1 }, { logger: overrideLogger });

    expect(overrideLogger.child).toHaveBeenCalledWith({ flowAgentId: "test-flow" });
  });
});

// ---------------------------------------------------------------------------
// generate() — void output (no output schema)
// ---------------------------------------------------------------------------

describe("generate() void output", () => {
  it("collects text from messages when no output schema is defined", async () => {
    const fa = flowAgent<{ x: number }>(
      {
        name: "void-gen",
        input: Input,
        logger: createMockLogger(),
      },
      async ({ input, $ }) => {
        await $.step({
          id: "compute",
          execute: async () => `result: ${input.x * 2}`,
        });
      },
    );

    const result = await fa.generate({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.output).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// stream() — success path
// ---------------------------------------------------------------------------

describe("stream() success", () => {
  it("returns ok: true with fullStream, output, messages, usage, and finishReason", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fullStream).toBeInstanceOf(ReadableStream);
    expect(result.output).toBeInstanceOf(Promise);
    expect(result.messages).toBeInstanceOf(Promise);
    expect(result.usage).toBeInstanceOf(Promise);
    expect(result.finishReason).toBeInstanceOf(Promise);
  });

  it("output promise resolves to computed output", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ x: 4 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    const output = await result.output;
    expect(output).toEqual({ y: 8 });
  });

  it("fullStream emits a finish event on success", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ x: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parts: unknown[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }

    // Last part should be a finish event
    expect(parts.length).toBeGreaterThanOrEqual(1);
    const lastPart = parts[parts.length - 1] as Record<string, unknown>;
    expect(lastPart.type).toBe("finish");
    expect(lastPart.finishReason).toBe("stop");
  });

  it("messages promise resolves after stream completes", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    const messages = await result.messages;
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]?.role).toBe("user");
  });

  it("usage promise resolves with zero-valued fields when no sub-agents", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    const usage = await result.usage;
    expect(usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    });
  });

  it("finishReason promise resolves to stop", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    const finishReason = await result.finishReason;
    expect(finishReason).toBe("stop");
  });
});

// ---------------------------------------------------------------------------
// stream() — with steps
// ---------------------------------------------------------------------------

describe("stream() with steps", () => {
  it("emits typed tool-call and tool-result events through fullStream", async () => {
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "stream-step-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ input, $ }) => {
        await $.step({
          id: "compute",
          execute: async () => input.x + 1,
        });

        return { y: input.x + 1 };
      },
    );

    const result = await fa.stream({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parts: Record<string, unknown>[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value as Record<string, unknown>);
    }

    // Should have tool-call event, tool-result event, and finish event
    expect(parts.length).toBeGreaterThanOrEqual(3);

    const toolCallPart = parts.find((p) => p.type === "tool-call");
    expect(toolCallPart).toBeDefined();
    expect(toolCallPart?.toolName).toBe("compute");

    const toolResultPart = parts.find((p) => p.type === "tool-result");
    expect(toolResultPart).toBeDefined();
    expect(toolResultPart?.toolName).toBe("compute");
    expect(toolResultPart?.output).toBe(6);

    const finishPart = parts.find((p) => p.type === "finish");
    expect(finishPart).toBeDefined();
    expect(finishPart?.finishReason).toBe("stop");
  });
});

// ---------------------------------------------------------------------------
// stream() — input validation
// ---------------------------------------------------------------------------

describe("stream() input validation", () => {
  it("returns VALIDATION_ERROR when input fails safeParse", async () => {
    const fa = createSimpleFlowAgent();

    // @ts-expect-error - intentionally invalid input
    const result = await fa.stream({ x: "not-a-number" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Input validation failed");
  });
});

// ---------------------------------------------------------------------------
// stream() — error handling
// ---------------------------------------------------------------------------

describe("stream() error handling", () => {
  it("stream closes and output promise rejects when handler throws", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("stream handler fail");
    });

    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Suppress all derived promise rejections to avoid unhandled rejection noise
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    // Drain the stream (should close after error)
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    await expect(result.output).rejects.toThrow("stream handler fail");
  });

  it("writes error event and closes stream when handler throws", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("stream error test");
    });

    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Suppress derived promise rejections
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    // Drain the stream and collect events
    const parts: Record<string, unknown>[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value as Record<string, unknown>);
    }

    // Should have an error event in the stream
    const errorPart = parts.find((p) => p.type === "error");
    expect(errorPart).toBeDefined();

    // Output should reject
    await expect(result.output).rejects.toThrow("stream error test");
  });
});

// ---------------------------------------------------------------------------
// stream() — output validation
// ---------------------------------------------------------------------------

describe("stream() output validation", () => {
  it("rejects output promise with Output validation failed when handler returns invalid data", async () => {
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "test",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async () => ({ y: "not-a-number" }) as unknown as { y: number },
    );

    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Suppress derived promise rejections
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    await expect(result.output).rejects.toThrow("Output validation failed");
  });
});

// ---------------------------------------------------------------------------
// stream() — hooks
// ---------------------------------------------------------------------------

describe("stream() hooks", () => {
  it("fires onStart hook with input", async () => {
    const onStart = vi.fn();
    const fa = createSimpleFlowAgent({ onStart });
    await fa.stream({ x: 5 });

    expect(onStart).toHaveBeenCalledTimes(1);
    const firstCall = onStart.mock.calls[0];
    if (!firstCall) throw new Error("Expected onStart first call");
    expect(firstCall[0]).toEqual({ input: { x: 5 } });
  });

  it("fires onFinish hook after stream completes", async () => {
    const onFinish = vi.fn();
    const fa = createSimpleFlowAgent({ onFinish });
    const result = await fa.stream({ x: 3 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    // Wait for output to settle (which means onFinish has fired)
    await result.output;

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onStart hooks during stream", async () => {
    const configOnStart = vi.fn();
    const overrideOnStart = vi.fn();

    const fa = createSimpleFlowAgent({ onStart: configOnStart });
    const result = await fa.stream({ x: 7 }, { onStart: overrideOnStart });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    await result.output;

    expect(configOnStart).toHaveBeenCalledTimes(1);
    expect(overrideOnStart).toHaveBeenCalledTimes(1);
    const configCall = configOnStart.mock.calls[0];
    const overrideCall = overrideOnStart.mock.calls[0];
    if (!configCall) throw new Error("Expected configOnStart first call");
    if (!overrideCall) throw new Error("Expected overrideOnStart first call");
    expect(configCall[0]).toEqual({ input: { x: 7 } });
    expect(overrideCall[0]).toEqual({ input: { x: 7 } });
  });

  it("fires onError hook when handler throws during stream", async () => {
    const onError = vi.fn();
    const fa = createSimpleFlowAgent({ onError }, async () => {
      throw new Error("stream boom");
    });
    const result = await fa.stream({ x: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Suppress all derived promise rejections
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    // Wait for the error to settle
    await result.output.catch(() => {});

    expect(onError).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// stream() — void output (no output schema)
// ---------------------------------------------------------------------------

describe("stream() void output", () => {
  it("collects text from messages when no output schema is defined", async () => {
    const fa = flowAgent<{ x: number }>(
      {
        name: "void-flow",
        input: Input,
        logger: createMockLogger(),
      },
      async ({ input, $ }) => {
        await $.step({
          id: "compute",
          execute: async () => `result: ${input.x * 2}`,
        });
      },
    );

    const result = await fa.stream({ x: 5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }

    const output = await result.output;
    expect(typeof output).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// fn() — delegates to generate()
// ---------------------------------------------------------------------------

describe("fn()", () => {
  it("returns a function that delegates to generate()", async () => {
    const fa = createSimpleFlowAgent();
    const fn = fa.fn();

    const result = await fn({ x: 6 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ y: 12 });
  });

  it("fn() passes overrides through to generate", async () => {
    const onStart = vi.fn();
    const fa = createSimpleFlowAgent();
    const fn = fa.fn();

    await fn({ x: 1 }, { onStart });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("fn() handles validation errors", async () => {
    const fa = createSimpleFlowAgent();
    const fn = fa.fn();

    // @ts-expect-error - intentionally invalid input
    const result = await fn({ x: "bad" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("handles undefined overrides gracefully", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ x: 1 }, undefined);

    expect(result.ok).toBe(true);
  });

  it("uses default logger when none provided", async () => {
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "no-logger-flow",
        input: Input,
        output: Output,
      },
      async ({ input }) => ({ y: input.x }),
    );

    const result = await fa.generate({ x: 1 });
    expect(result.ok).toBe(true);
  });

  it("handler receives scoped logger", async () => {
    let receivedLog: unknown;
    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "log-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ input, log }) => {
        receivedLog = log;
        return { y: input.x };
      },
    );

    await fa.generate({ x: 1 });

    expect(receivedLog).toBeDefined();
  });
});
