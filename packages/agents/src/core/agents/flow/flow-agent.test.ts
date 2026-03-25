import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import { RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";
import { createMockLogger } from "@/testing/index.js";

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

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("generate() success", () => {
  it("returns ok: true with computed output", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: 10 });
  });

  it("includes usage with zero-valued fields when no sub-agents run", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    });
  });

  it("includes finishReason of stop", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.finishReason).toBe("stop");
  });

  it("includes trace array", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.trace).toBeInstanceOf(Array);
  });

  it("includes duration >= 0", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

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

        if (result.ok) {
          return { y: result.output };
        }
        return { y: 0 };
      },
    );

    const result = await fa.generate({ input: { x: 7 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: 14 });
  });
});

describe("generate() input validation", () => {
  it("returns VALIDATION_ERROR when input fails safeParse", async () => {
    const fa = createSimpleFlowAgent();

    // @ts-expect-error - intentionally invalid input
    const result = await fa.generate({ input: { x: "not-a-number" } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Input validation failed");
  });

  it("returns VALIDATION_ERROR when required fields are missing", async () => {
    const fa = createSimpleFlowAgent();

    // @ts-expect-error - intentionally missing field
    const result = await fa.generate({ input: {} });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
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
    await fa.generate({ input: { x: "bad" } });

    expect(handler).not.toHaveBeenCalled();
  });
});

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

    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Output validation failed");
  });
});

describe("generate() error handling", () => {
  it("returns FLOW_AGENT_ERROR when handler throws an Error", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("handler exploded");
    });

    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("FLOW_AGENT_ERROR");
    expect(result.error.message).toBe("handler exploded");
    expect(result.error.cause).toBeInstanceOf(Error);
  });

  it("wraps non-Error throws into Error with FLOW_AGENT_ERROR code", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("string error");
    });

    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("FLOW_AGENT_ERROR");
    expect(result.error.message).toBe("string error");
  });
});

describe("generate() hooks", () => {
  it("fires onStart hook with input", async () => {
    const onStart = vi.fn();
    const fa = createSimpleFlowAgent({ onStart });
    await fa.generate({ input: { x: 5 } });

    expect(onStart).toHaveBeenCalledTimes(1);
    const [firstCall] = onStart.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStart first call");
    }
    expect(firstCall[0]).toEqual({ input: { x: 5 } });
  });

  it("fires onFinish hook with input, result, and duration", async () => {
    const onFinish = vi.fn();
    const fa = createSimpleFlowAgent({ onFinish });
    await fa.generate({ input: { x: 3 } });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onFinish first call");
    }
    const [event] = firstCall;
    expect(event.input).toEqual({ x: 3 });
    expect(event.result).toHaveProperty("output");
    expect(event.result).toHaveProperty("usage");
    expect(event.duration).toBeGreaterThanOrEqual(0);
  });

  it("fires onError hook when handler throws", async () => {
    const onError = vi.fn();
    const fa = createSimpleFlowAgent({ onError }, async () => {
      throw new Error("boom");
    });
    await fa.generate({ input: { x: 1 } });

    expect(onError).toHaveBeenCalledTimes(1);
    const [firstCall] = onError.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onError first call");
    }
    expect(firstCall[0].input).toEqual({ x: 1 });
    expect(firstCall[0].error).toBeInstanceOf(Error);
    expect(firstCall[0].error.message).toBe("boom");
  });

  it("fires both config and override onStart hooks", async () => {
    const configOnStart = vi.fn();
    const overrideOnStart = vi.fn();

    const fa = createSimpleFlowAgent({ onStart: configOnStart });
    await fa.generate({ input: { x: 1 }, onStart: overrideOnStart });

    expect(configOnStart).toHaveBeenCalledTimes(1);
    expect(overrideOnStart).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onFinish hooks", async () => {
    const configOnFinish = vi.fn();
    const overrideOnFinish = vi.fn();

    const fa = createSimpleFlowAgent({ onFinish: configOnFinish });
    await fa.generate({ input: { x: 1 }, onFinish: overrideOnFinish });

    expect(configOnFinish).toHaveBeenCalledTimes(1);
    expect(overrideOnFinish).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onError hooks", async () => {
    const configOnError = vi.fn();
    const overrideOnError = vi.fn();

    const fa = createSimpleFlowAgent({ onError: configOnError }, async () => {
      throw new Error("fail");
    });
    await fa.generate({ input: { x: 1 }, onError: overrideOnError });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(overrideOnError).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onStepFinish hooks", async () => {
    const configOnStepFinish = vi.fn();
    const overrideOnStepFinish = vi.fn();

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "step-hook-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepFinish: configOnStepFinish,
      },
      async ({ input, $ }) => {
        await $.step({
          id: "double",
          execute: async () => input.x * 2,
        });
        return { y: input.x * 2 };
      },
    );

    await fa.generate({ input: { x: 3 }, onStepFinish: overrideOnStepFinish });

    expect(configOnStepFinish).toHaveBeenCalledTimes(1);
    expect(overrideOnStepFinish).toHaveBeenCalledTimes(1);

    const [configCall] = configOnStepFinish.mock.calls;
    const [overrideCall] = overrideOnStepFinish.mock.calls;
    if (!configCall) {
      throw new Error("Expected configOnStepFinish first call");
    }
    if (!overrideCall) {
      throw new Error("Expected overrideOnStepFinish first call");
    }
    expect(configCall[0]).toHaveProperty("stepId");
    expect(configCall[0]).toHaveProperty("stepOperation");
    expect(configCall[0]).toHaveProperty("duration");
    expect(overrideCall[0]).toHaveProperty("stepId");
    expect(overrideCall[0]).toHaveProperty("stepOperation");
    expect(overrideCall[0]).toHaveProperty("duration");
  });

  it("fires config onStepFinish before override onStepFinish", async () => {
    const order: string[] = [];
    const configOnStepFinish = vi.fn(() => {
      order.push("config");
    });
    const overrideOnStepFinish = vi.fn(() => {
      order.push("override");
    });

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "order-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        onStepFinish: configOnStepFinish,
      },
      async ({ input, $ }) => {
        await $.step({
          id: "compute",
          execute: async () => input.x,
        });
        return { y: input.x };
      },
    );

    await fa.generate({ input: { x: 1 }, onStepFinish: overrideOnStepFinish });

    expect(order).toEqual(["config", "override"]);
  });

  it("does not fire onFinish when handler throws", async () => {
    const onFinish = vi.fn();

    const fa = createSimpleFlowAgent({ onFinish }, async () => {
      throw new Error("fail");
    });
    await fa.generate({ input: { x: 1 } });

    expect(onFinish).not.toHaveBeenCalled();
  });

  it("does not fire onError on input validation failure", async () => {
    const onError = vi.fn();
    const fa = createSimpleFlowAgent({ onError });

    // @ts-expect-error - intentionally invalid input
    await fa.generate({ input: { x: "bad" } });

    expect(onError).not.toHaveBeenCalled();
  });
});

describe("generate() hook resilience", () => {
  it("onStart throwing does not prevent execution", async () => {
    const fa = createSimpleFlowAgent({
      onStart: () => {
        throw new Error("onStart boom");
      },
    });

    const result = await fa.generate({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: 10 });
  });

  it("onFinish throwing does not break the result", async () => {
    const fa = createSimpleFlowAgent({
      onFinish: () => {
        throw new Error("onFinish boom");
      },
    });

    const result = await fa.generate({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
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

    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("FLOW_AGENT_ERROR");
    expect(result.error.message).toBe("handler fail");
  });
});

describe("generate() overrides", () => {
  it("uses override signal when provided", async () => {
    const controller = new AbortController();
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 1 }, signal: controller.signal });

    expect(result.ok).toBeTruthy();
  });

  it("uses override logger when provided", async () => {
    const overrideLogger = createMockLogger();
    const fa = createSimpleFlowAgent();
    await fa.generate({ input: { x: 1 }, logger: overrideLogger });

    expect(overrideLogger.child).toHaveBeenCalledWith({ flowAgentId: "test-flow" });
  });
});

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

    const result = await fa.generate({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(typeof result.output).toBe("string");
  });
});

describe("stream() success", () => {
  it("returns ok: true with fullStream, output, messages, usage, and finishReason", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.fullStream).toBeInstanceOf(ReadableStream);
    expect(result.output).toBeDefined();
    expect(result.usage).toBeDefined();
    expect(result.finishReason).toBeDefined();
  });

  it("output promise resolves to computed output", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ input: { x: 4 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const output = await result.output;
    expect(output).toEqual({ y: 8 });
  });

  it("fullStream emits a finish event on success", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ input: { x: 2 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    const parts: unknown[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parts.push(value);
    }

    // Last part should be a finish event
    expect(parts.length).toBeGreaterThanOrEqual(1);
    const lastPart = parts.at(-1) as Record<string, unknown>;
    expect(lastPart["type"]).toBe("finish");
    expect(lastPart["finishReason"]).toBe("stop");
  });

  it("messages promise resolves after stream completes", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }
  });

  it("usage promise resolves with zero-valued fields when no sub-agents", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const usage = await result.usage;
    expect(usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    });
  });

  it("finishReason promise resolves to stop", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const finishReason = await result.finishReason;
    expect(finishReason).toBe("stop");
  });
});

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

    const result = await fa.stream({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    const parts: Record<string, unknown>[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parts.push(value as Record<string, unknown>);
    }

    // Should have tool-call event, tool-result event, and finish event
    expect(parts.length).toBeGreaterThanOrEqual(3);

    const toolCallPart = parts.find((p) => p["type"] === "tool-call");
    expect(toolCallPart).toBeDefined();
    expect(toolCallPart?.["toolName"]).toBe("compute");

    const toolResultPart = parts.find((p) => p["type"] === "tool-result");
    expect(toolResultPart).toBeDefined();
    expect(toolResultPart?.["toolName"]).toBe("compute");
    expect(toolResultPart?.["output"]).toBe(6);

    const finishPart = parts.find((p) => p["type"] === "finish");
    expect(finishPart).toBeDefined();
    expect(finishPart?.["finishReason"]).toBe("stop");
  });
});

describe("stream() input validation", () => {
  it("returns VALIDATION_ERROR when input fails safeParse", async () => {
    const fa = createSimpleFlowAgent();

    // @ts-expect-error - intentionally invalid input
    const result = await fa.stream({ input: { x: "not-a-number" } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Input validation failed");
  });
});

describe("stream() error handling", () => {
  it("stream closes and output promise rejects when handler throws", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("stream handler fail");
    });

    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Suppress all derived promise rejections to avoid unhandled rejection noise
    result.usage.then(undefined, () => {});
    result.finishReason.then(undefined, () => {});

    // Drain the stream (should close after error)
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    await expect(result.output).rejects.toThrow("stream handler fail");
  });

  it("writes error event and closes stream when handler throws", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("stream error test");
    });

    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Suppress derived promise rejections
    result.usage.then(undefined, () => {});
    result.finishReason.then(undefined, () => {});

    // Drain the stream and collect events
    const parts: Record<string, unknown>[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parts.push(value as Record<string, unknown>);
    }

    // Should have an error event in the stream
    const errorPart = parts.find((p) => p["type"] === "error");
    expect(errorPart).toBeDefined();

    // Output should reject
    await expect(result.output).rejects.toThrow("stream error test");
  });
});

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

    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Suppress derived promise rejections
    result.usage.then(undefined, () => {});
    result.finishReason.then(undefined, () => {});

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    await expect(result.output).rejects.toThrow("Output validation failed");
  });
});

describe("stream() hooks", () => {
  it("fires onStart hook with input", async () => {
    const onStart = vi.fn();
    const fa = createSimpleFlowAgent({ onStart });
    await fa.stream({ input: { x: 5 } });

    expect(onStart).toHaveBeenCalledTimes(1);
    const [firstCall] = onStart.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStart first call");
    }
    expect(firstCall[0]).toEqual({ input: { x: 5 } });
  });

  it("fires onFinish hook after stream completes", async () => {
    const onFinish = vi.fn();
    const fa = createSimpleFlowAgent({ onFinish });
    const result = await fa.stream({ input: { x: 3 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    // Wait for output to settle (which means onFinish has fired)
    await result.output;

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onStart hooks during stream", async () => {
    const configOnStart = vi.fn();
    const overrideOnStart = vi.fn();

    const fa = createSimpleFlowAgent({ onStart: configOnStart });
    const result = await fa.stream({ input: { x: 7 }, onStart: overrideOnStart });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    await result.output;

    expect(configOnStart).toHaveBeenCalledTimes(1);
    expect(overrideOnStart).toHaveBeenCalledTimes(1);
    const [configCall] = configOnStart.mock.calls;
    const [overrideCall] = overrideOnStart.mock.calls;
    if (!configCall) {
      throw new Error("Expected configOnStart first call");
    }
    if (!overrideCall) {
      throw new Error("Expected overrideOnStart first call");
    }
    expect(configCall[0]).toEqual({ input: { x: 7 } });
    expect(overrideCall[0]).toEqual({ input: { x: 7 } });
  });

  it("fires onError hook when handler throws during stream", async () => {
    const onError = vi.fn();
    const fa = createSimpleFlowAgent({ onError }, async () => {
      throw new Error("stream boom");
    });
    const result = await fa.stream({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Suppress all derived promise rejections
    result.usage.then(undefined, () => {});
    result.finishReason.then(undefined, () => {});

    // Drain
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    // Wait for the error to settle
    await result.output.then(undefined, () => {});

    expect(onError).toHaveBeenCalledTimes(1);
  });
});

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

    const result = await fa.stream({ input: { x: 5 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const output = await result.output;
    expect(typeof output).toBe("string");
  });
});

describe("fn()", () => {
  it("returns a function that delegates to generate()", async () => {
    const fa = createSimpleFlowAgent();
    const fn = fa.fn();

    const result = await fn({ input: { x: 6 } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ y: 12 });
  });

  it("fn() passes overrides through to generate", async () => {
    const onStart = vi.fn();
    const fa = createSimpleFlowAgent();
    const fn = fa.fn();

    await fn({ input: { x: 1 }, onStart });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("fn() handles validation errors", async () => {
    const fa = createSimpleFlowAgent();
    const fn = fa.fn();

    // @ts-expect-error - intentionally invalid input
    const result = await fn({ input: { x: "bad" } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("generate() with agents dependency", () => {
  it("handler receives agents from config", async () => {
    let receivedAgents: Record<string, unknown> | undefined;
    const mockAgent = { generate: vi.fn(), stream: vi.fn(), fn: vi.fn() };

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "agents-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        agents: { core: mockAgent as never },
      },
      async ({ input, agents }) => {
        receivedAgents = agents;
        return { y: input.x };
      },
    );

    await fa.generate({ input: { x: 1 } });

    expect(receivedAgents).toBeDefined();
    expect(receivedAgents?.["core"]).toBe(mockAgent);
  });

  it("handler receives empty record when agents not configured", async () => {
    let receivedAgents: Record<string, unknown> | undefined;

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "no-agents-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
      },
      async ({ input, agents }) => {
        receivedAgents = agents;
        return { y: input.x };
      },
    );

    await fa.generate({ input: { x: 1 } });

    expect(receivedAgents).toBeDefined();
    expect(receivedAgents).toEqual({});
  });
});

describe("stream() with agents dependency", () => {
  it("handler receives agents from config during streaming", async () => {
    let receivedAgents: Record<string, unknown> | undefined;
    const mockAgent = { generate: vi.fn(), stream: vi.fn(), fn: vi.fn() };

    const fa = flowAgent<{ x: number }, { y: number }>(
      {
        name: "stream-agents-flow",
        input: Input,
        output: Output,
        logger: createMockLogger(),
        agents: { core: mockAgent as never },
      },
      async ({ input, agents }) => {
        receivedAgents = agents;
        return { y: input.x };
      },
    );

    const result = await fa.stream({ input: { x: 1 } });
    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    await result.output;

    expect(receivedAgents).toBeDefined();
    expect(receivedAgents?.["core"]).toBe(mockAgent);
  });
});

describe("edge cases", () => {
  it("handles undefined overrides gracefully", async () => {
    const fa = createSimpleFlowAgent();
    const result = await fa.generate({ input: { x: 1 } });

    expect(result.ok).toBeTruthy();
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

    const result = await fa.generate({ input: { x: 1 } });
    expect(result.ok).toBeTruthy();
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

    await fa.generate({ input: { x: 1 } });

    expect(receivedLog).toBeDefined();
  });
});

describe("stream() unhandled rejection safety", () => {
  it("does not emit unhandledRejection when consumer ignores derived promises", async () => {
    const fa = createSimpleFlowAgent(undefined, async () => {
      throw new Error("derived promise rejection test");
    });

    const unhandledRejections: unknown[] = [];
    const handler = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on("unhandledRejection", handler);

    try {
      const result = await fa.stream({ input: { x: 1 } });

      expect(result.ok).toBeTruthy();
      if (!result.ok) {
        return;
      }

      // Intentionally do NOT .catch() any derived promises (output, messages, usage, finishReason).
      // Before the fix, this would cause unhandled rejection warnings.

      // Drain the stream to trigger the error
      const reader = result.fullStream.getReader();
      for (;;) {
        const { done } = await reader.read();
        if (done) {
          break;
        }
      }

      // Allow microtasks to settle so any unhandled rejections would fire
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      expect(unhandledRejections).toEqual([]);
    } finally {
      process.removeListener("unhandledRejection", handler);
    }
  });
});
