import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import { agent } from "@/core/agents/base/agent.js";
import { RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";
import { createMockLogger } from "@/testing/index.js";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory must return partial shape; full module type is too broad
    }) as any,
);

vi.mock(
  import("@/lib/middleware.js"),
  () =>
    ({
      withModelMiddleware: vi.fn(async ({ model }: { model: unknown }) => model),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory must return partial shape; full module type is too broad
    }) as any,
);

const MOCK_TOTAL_USAGE = {
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  inputTokenDetails: {
    noCacheTokens: 85,
    cacheReadTokens: 10,
    cacheWriteTokens: 5,
  },
  outputTokenDetails: {
    textTokens: 47,
    reasoningTokens: 3,
  },
};

function createMockGenerateResult(overrides?: {
  text?: string;
  output?: unknown;
  response?: { messages: unknown[] };
  totalUsage?: typeof MOCK_TOTAL_USAGE;
  finishReason?: string;
}) {
  const defaults = {
    text: "mock response text",
    output: undefined,
    response: { messages: [{ role: "assistant", content: "mock" }] },
    totalUsage: MOCK_TOTAL_USAGE,
    finishReason: "stop",
  };
  return { ...defaults, ...overrides };
}

function createMockStreamResult(overrides?: {
  text?: string;
  output?: unknown;
  response?: { messages: unknown[] };
  chunks?: string[];
  totalUsage?: typeof MOCK_TOTAL_USAGE;
  finishReason?: string;
}) {
  const defaults = {
    chunks: ["hello", " world"] as string[],
    output: undefined as unknown,
    response: undefined as { messages: unknown[] } | undefined,
    totalUsage: MOCK_TOTAL_USAGE,
    finishReason: "stop",
  };
  const merged = { ...defaults, ...overrides };
  const { chunks } = merged;
  const textValue = merged.text ?? chunks.join("");

  async function* makeFullStream() {
    for (const chunk of chunks) {
      yield { type: "text-delta" as const, textDelta: chunk };
    }
  }

  return {
    fullStream: makeFullStream(),
    text: Promise.resolve(textValue),
    output: Promise.resolve(merged.output),
    response: Promise.resolve(
      merged.response ?? { messages: [{ role: "assistant", content: textValue }] },
    ),
    totalUsage: Promise.resolve(merged.totalUsage),
    finishReason: Promise.resolve(merged.finishReason),
    toTextStreamResponse: vi.fn(() => new Response("mock text stream")),
    toUIMessageStreamResponse: vi.fn(() => new Response("mock ui stream")),
  };
}

function createSimpleAgent(overrides?: Partial<Parameters<typeof agent>[0]>) {
  return agent({
    name: "test-agent",
    model: { modelId: "mock-model" } as never,
    system: "You are a test agent.",
    logger: createMockLogger(),
    ...overrides,
  });
}

function createTypedAgent(
  overrides?: Partial<Parameters<typeof agent<{ topic: string }, string>>[0]>,
) {
  return agent<{ topic: string }, string>({
    name: "typed-agent",
    model: { modelId: "mock-model" } as never,
    input: z.object({ topic: z.string() }),
    prompt: ({ input }) => `Tell me about ${input.topic}`,
    system: "You are a typed agent.",
    logger: createMockLogger(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateText.mockResolvedValue(createMockGenerateResult());
  mockStreamText.mockReturnValue(createMockStreamResult());
});

describe("agent creation", () => {
  it("returns an object with generate, stream, and fn methods", () => {
    const a = createSimpleAgent();

    expect(typeof a.generate).toBe("function");
    expect(typeof a.stream).toBe("function");
    expect(typeof a.fn).toBe("function");
  });

  it("attaches RUNNABLE_META with name and no inputSchema for simple agents", () => {
    const a = createSimpleAgent();
    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
    const meta = (a as unknown as Record<symbol, unknown>)[RUNNABLE_META] as RunnableMeta;

    expect(meta.name).toBe("test-agent");
    expect(meta.inputSchema).toBeUndefined();
  });

  it("attaches RUNNABLE_META with name and inputSchema for typed agents", () => {
    const a = createTypedAgent();
    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
    const meta = (a as unknown as Record<symbol, unknown>)[RUNNABLE_META] as RunnableMeta;

    expect(meta.name).toBe("typed-agent");
    expect(meta.inputSchema).toBeDefined();
  });
});

describe("generate() success", () => {
  it("returns ok: true with text output for simple agent", async () => {
    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("mock response text");
    expect(result.messages).toBeInstanceOf(Array);
    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 10,
      cacheWriteTokens: 5,
      reasoningTokens: 3,
    });
    expect(result.finishReason).toBe("stop");
  });

  it("returns ok: true with text output for typed agent", async () => {
    const a = createTypedAgent();
    const result = await a.generate({ input: { topic: "TypeScript" } });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("mock response text");
  });

  it("passes system prompt to generateText", async () => {
    const a = createSimpleAgent({ system: "Custom system prompt" });
    await a.generate({ prompt: "test" });

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].system).toBe("Custom system prompt");
  });

  it("passes string prompt for simple mode", async () => {
    const a = createSimpleAgent();
    await a.generate({ prompt: "hello world" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].prompt).toBe("hello world");
  });

  it("passes rendered prompt for typed mode", async () => {
    const a = createTypedAgent();
    await a.generate({ input: { topic: "Rust" } });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].prompt).toBe("Tell me about Rust");
  });

  it("passes messages array for message-based input", async () => {
    const a = createSimpleAgent();
    const messages = [{ role: "user" as const, content: "hello" }];
    await a.generate({ prompt: messages } as never);

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].messages).toEqual(messages);
  });

  it("uses default maxSteps of 20 when not specified", async () => {
    const a = createSimpleAgent();
    await a.generate({ prompt: "test" });

    expect(mockStepCountIs).toHaveBeenCalledWith(20);
  });

  it("uses custom maxSteps from config", async () => {
    const a = createSimpleAgent({ maxSteps: 10 });
    await a.generate({ prompt: "test" });

    expect(mockStepCountIs).toHaveBeenCalledWith(10);
  });

  it("uses maxSteps from overrides over config", async () => {
    const a = createSimpleAgent({ maxSteps: 10 });
    await a.generate({ prompt: "test", maxSteps: 5 });

    expect(mockStepCountIs).toHaveBeenCalledWith(5);
  });
});

describe("generate() input validation", () => {
  it("returns VALIDATION_ERROR when typed input fails safeParse", async () => {
    const a = createTypedAgent();

    // @ts-expect-error - intentionally invalid input
    const result = await a.generate({ input: { topic: 123 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Input validation failed");
  });

  it("returns VALIDATION_ERROR when required fields are missing", async () => {
    const a = createTypedAgent();

    // @ts-expect-error - intentionally missing field
    const result = await a.generate({ input: {} });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not call generateText when input validation fails", async () => {
    const a = createTypedAgent();

    // @ts-expect-error - intentionally invalid input
    await a.generate({ input: { topic: 123 } });

    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("skips validation for simple agents without input schema", async () => {
    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "anything" });

    expect(result.ok).toBeTruthy();
  });
});

describe("generate() output resolution", () => {
  it("returns text output when no output config is set", async () => {
    mockGenerateText.mockResolvedValue(createMockGenerateResult({ text: "text output" }));

    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("text output");
  });

  it("returns structured output when output config produces an output field", async () => {
    mockGenerateText.mockResolvedValue(
      createMockGenerateResult({ output: { summary: "structured" } }),
    );

    const a = createSimpleAgent({
      output: { parseCompleteOutput: vi.fn() } as never,
    });
    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toEqual({ summary: "structured" });
  });
});

describe("generate() system prompt", () => {
  it("passes static string system prompt", async () => {
    const a = createSimpleAgent({ system: "Static system" });
    await a.generate({ prompt: "test" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].system).toBe("Static system");
  });

  it("passes function system prompt resolved with input", async () => {
    const a = createSimpleAgent({
      system: ({ input }: { input: unknown }) => `System for: ${input}`,
    });
    await a.generate({ prompt: "my-input" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].system).toBe("System for: my-input");
  });

  it("passes undefined system when not configured", async () => {
    const a = createSimpleAgent({ system: undefined });
    await a.generate({ prompt: "test" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].system).toBeUndefined();
  });

  it("uses override system prompt over config", async () => {
    const a = createSimpleAgent({ system: "original" });
    await a.generate({ prompt: "test", system: "overridden" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].system).toBe("overridden");
  });
});

describe("generate() hooks", () => {
  it("fires onStart hook with input", async () => {
    const onStart = vi.fn();
    const a = createSimpleAgent({ onStart });
    await a.generate({ prompt: "hello" });

    expect(onStart).toHaveBeenCalledTimes(1);
    const [firstCall] = onStart.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStart first call");
    }
    expect(firstCall[0]).toEqual({ input: "hello" });
  });

  it("fires onFinish hook with input, result (including usage), and duration", async () => {
    const onFinish = vi.fn();
    const a = createSimpleAgent({ onFinish });
    await a.generate({ prompt: "hello" });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onFinish first call");
    }
    const [event] = firstCall;
    expect(event.input).toBe("hello");
    expect(event.result).toHaveProperty("output");
    expect(event.result).toHaveProperty("messages");
    expect(event.result).toHaveProperty("usage");
    expect(event.result).toHaveProperty("finishReason");
    expect(event.duration).toBeGreaterThanOrEqual(0);
  });

  it("fires onStepFinish hook during tool loop", async () => {
    const onStepFinish = vi.fn();

    mockGenerateText.mockImplementation(
      async (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        if (opts.onStepFinish) {
          await opts.onStepFinish({
            toolCalls: [],
            toolResults: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          });
          await opts.onStepFinish({
            toolCalls: [],
            toolResults: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          });
        }
        return createMockGenerateResult();
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    await a.generate({ prompt: "test" });

    expect(onStepFinish).toHaveBeenCalledTimes(2);
    const [firstCall] = onStepFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStepFinish first call");
    }
    expect(firstCall[0].stepId).toBe("test-agent:0");

    const [, secondCall] = onStepFinish.mock.calls;
    if (!secondCall) {
      throw new Error("Expected onStepFinish second call");
    }
    expect(secondCall[0].stepId).toBe("test-agent:1");
  });

  it("fires onStepFinish with mapped toolCalls and toolResults in generate", async () => {
    const onStepFinish = vi.fn();

    mockGenerateText.mockImplementation(
      async (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        if (opts.onStepFinish) {
          await opts.onStepFinish({
            toolCalls: [{ toolName: "myTool", args: { foo: "bar" } }],
            toolResults: [{ toolName: "myTool", result: { answer: 42 } }],
            usage: { inputTokens: 10, outputTokens: 5 },
          });
        }
        return createMockGenerateResult();
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    await a.generate({ prompt: "test" });

    expect(onStepFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onStepFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStepFinish first call");
    }
    expect(firstCall[0].toolCalls).toEqual([{ toolName: "myTool", argsTextLength: 13 }]);
    expect(firstCall[0].toolResults).toEqual([{ toolName: "myTool", resultTextLength: 13 }]);
  });

  it("handles missing args/result properties in toolCalls/toolResults", async () => {
    const onStepFinish = vi.fn();

    mockGenerateText.mockImplementation(
      async (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        if (opts.onStepFinish) {
          await opts.onStepFinish({
            toolCalls: [{ toolName: "t" }],
            toolResults: [{ toolName: "t" }],
            usage: { inputTokens: 0, outputTokens: 0 },
          });
        }
        return createMockGenerateResult();
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    await a.generate({ prompt: "test" });

    expect(onStepFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onStepFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStepFinish first call");
    }
    // ExtractProperty returns {} when key is missing, safeSerializedLength({}) = 2
    expect(firstCall[0].toolCalls).toEqual([{ toolName: "t", argsTextLength: 2 }]);
    expect(firstCall[0].toolResults).toEqual([{ toolName: "t", resultTextLength: 2 }]);
  });

  it("handles undefined usage in onStepFinish", async () => {
    const onStepFinish = vi.fn();

    mockGenerateText.mockImplementation(
      async (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        if (opts.onStepFinish) {
          await opts.onStepFinish({
            toolCalls: [],
            toolResults: [],
          });
        }
        return createMockGenerateResult();
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    await a.generate({ prompt: "test" });

    expect(onStepFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onStepFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStepFinish first call");
    }
    expect(firstCall[0].usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });

  it("handles circular reference in tool args gracefully", async () => {
    const onStepFinish = vi.fn();

    mockGenerateText.mockImplementation(
      async (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional circular ref for test
        const circular: any = {};
        circular.self = circular;
        if (opts.onStepFinish) {
          await opts.onStepFinish({
            toolCalls: [{ toolName: "t", args: circular }],
            toolResults: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          });
        }
        return createMockGenerateResult();
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    await a.generate({ prompt: "test" });

    expect(onStepFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onStepFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStepFinish first call");
    }
    // SafeSerializedLength returns 0 for circular references
    expect(firstCall[0].toolCalls).toEqual([{ toolName: "t", argsTextLength: 0 }]);
  });

  it("fires both config and override onStart hooks", async () => {
    const configOnStart = vi.fn();
    const overrideOnStart = vi.fn();

    const a = createSimpleAgent({ onStart: configOnStart });
    await a.generate({ prompt: "test", onStart: overrideOnStart });

    expect(configOnStart).toHaveBeenCalledTimes(1);
    expect(overrideOnStart).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onFinish hooks", async () => {
    const configOnFinish = vi.fn();
    const overrideOnFinish = vi.fn();

    const a = createSimpleAgent({ onFinish: configOnFinish });
    await a.generate({ prompt: "test", onFinish: overrideOnFinish });

    expect(configOnFinish).toHaveBeenCalledTimes(1);
    expect(overrideOnFinish).toHaveBeenCalledTimes(1);
  });

  it("fires both config and override onStepFinish hooks", async () => {
    const configOnStepFinish = vi.fn();
    const overrideOnStepFinish = vi.fn();

    mockGenerateText.mockImplementation(
      async (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        if (opts.onStepFinish) {
          await opts.onStepFinish({
            toolCalls: [],
            toolResults: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          });
        }
        return createMockGenerateResult();
      },
    );

    const a = createSimpleAgent({ onStepFinish: configOnStepFinish });
    await a.generate({ prompt: "test", onStepFinish: overrideOnStepFinish });

    expect(configOnStepFinish).toHaveBeenCalledTimes(1);
    expect(overrideOnStepFinish).toHaveBeenCalledTimes(1);
  });
});

describe("generate() error handling", () => {
  it("returns AGENT_ERROR when generateText throws an Error", async () => {
    mockGenerateText.mockRejectedValue(new Error("model exploded"));

    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("AGENT_ERROR");
    expect(result.error.message).toBe("model exploded");
    expect(result.error.cause).toBeInstanceOf(Error);
  });

  it("wraps non-Error throws into Error with AGENT_ERROR code", async () => {
    mockGenerateText.mockRejectedValue("string error");

    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("AGENT_ERROR");
    expect(result.error.message).toBe("string error");
    expect(result.error.cause).toBeInstanceOf(Error);
  });

  it("fires onError hook when generateText throws", async () => {
    mockGenerateText.mockRejectedValue(new Error("boom"));
    const onError = vi.fn();

    const a = createSimpleAgent({ onError });
    await a.generate({ prompt: "test" });

    expect(onError).toHaveBeenCalledTimes(1);
    const [firstCall] = onError.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onError first call");
    }
    expect(firstCall[0].input).toBe("test");
    expect(firstCall[0].error).toBeInstanceOf(Error);
    expect(firstCall[0].error.message).toBe("boom");
  });

  it("fires both config and override onError hooks", async () => {
    mockGenerateText.mockRejectedValue(new Error("fail"));
    const configOnError = vi.fn();
    const overrideOnError = vi.fn();

    const a = createSimpleAgent({ onError: configOnError });
    await a.generate({ prompt: "test", onError: overrideOnError });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(overrideOnError).toHaveBeenCalledTimes(1);
  });

  it("does not fire onFinish when generateText throws", async () => {
    mockGenerateText.mockRejectedValue(new Error("fail"));
    const onFinish = vi.fn();

    const a = createSimpleAgent({ onFinish });
    await a.generate({ prompt: "test" });

    expect(onFinish).not.toHaveBeenCalled();
  });

  it("does not fire onError on input validation failure", async () => {
    const onError = vi.fn();
    const a = createTypedAgent({ onError });

    // @ts-expect-error - intentionally invalid input
    await a.generate({ input: { topic: 123 } });

    expect(onError).not.toHaveBeenCalled();
  });
});

describe("generate() hook resilience", () => {
  it("onStart throwing does not prevent generation", async () => {
    const a = createSimpleAgent({
      onStart: () => {
        throw new Error("onStart boom");
      },
    });

    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("mock response text");
  });

  it("onFinish throwing does not break the result", async () => {
    const a = createSimpleAgent({
      onFinish: () => {
        throw new Error("onFinish boom");
      },
    });

    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("mock response text");
  });

  it("onError throwing does not break the error result", async () => {
    mockGenerateText.mockRejectedValue(new Error("model fail"));

    const a = createSimpleAgent({
      onError: () => {
        throw new Error("onError boom");
      },
    });

    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("AGENT_ERROR");
    expect(result.error.message).toBe("model fail");
  });
});

describe("generate() overrides", () => {
  it("uses override model when provided", async () => {
    const overrideModel = { modelId: "override-model" } as never;
    const a = createSimpleAgent();
    await a.generate({ prompt: "test", model: overrideModel });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].model).toBe(overrideModel);
  });

  it("uses override system prompt when provided", async () => {
    const a = createSimpleAgent({ system: "original" });
    await a.generate({ prompt: "test", system: "override system" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].system).toBe("override system");
  });

  it("passes abort signal from overrides", async () => {
    const controller = new AbortController();
    const a = createSimpleAgent();
    await a.generate({ prompt: "test", signal: controller.signal });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].abortSignal).toBe(controller.signal);
  });

  it("uses override logger when provided", async () => {
    const overrideLogger = createMockLogger();
    const a = createSimpleAgent();
    await a.generate({ prompt: "test", logger: overrideLogger });

    expect(overrideLogger.child).toHaveBeenCalledWith({ agentId: "test-agent" });
  });
});

describe("stream() success", () => {
  it("returns ok: true with fullStream, output, messages, usage, and finishReason", async () => {
    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.fullStream).toBeInstanceOf(ReadableStream);
    expect(result.output).toBeInstanceOf(Promise);
    expect(result.messages).toBeInstanceOf(Promise);
    expect(result.usage).toBeInstanceOf(Promise);
    expect(result.finishReason).toBeInstanceOf(Promise);
  });

  it("fullStream emits typed StreamPart events", async () => {
    mockStreamText.mockReturnValue(createMockStreamResult({ chunks: ["chunk1", "chunk2"] }));

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    const parts: unknown[] = [];
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parts.push(value);
    }

    expect(parts).toEqual([
      { type: "text-delta", textDelta: "chunk1" },
      { type: "text-delta", textDelta: "chunk2" },
    ]);
  });

  it("output promise resolves to text after stream completes", async () => {
    mockStreamText.mockReturnValue(createMockStreamResult({ text: "full text" }));

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream to complete
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const output = await result.output;
    expect(output).toBe("full text");
  });

  it("messages promise resolves after stream completes", async () => {
    const expectedMessages = [{ role: "assistant", content: "msg" }];
    mockStreamText.mockReturnValue(
      createMockStreamResult({ response: { messages: expectedMessages } }),
    );

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream to complete
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const messages = await result.messages;
    expect(messages).toEqual(expectedMessages);
  });

  it("usage and finishReason promises resolve after stream completes", async () => {
    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream to complete
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    const usage = await result.usage;
    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 10,
      cacheWriteTokens: 5,
      reasoningTokens: 3,
    });

    const finishReason = await result.finishReason;
    expect(finishReason).toBe("stop");
  });
});

describe("stream() input validation", () => {
  it("returns VALIDATION_ERROR when typed input fails safeParse", async () => {
    const a = createTypedAgent();

    // @ts-expect-error - intentionally invalid input
    const result = await a.stream({ input: { topic: 123 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toContain("Input validation failed");
  });

  it("does not call streamText when input validation fails", async () => {
    const a = createTypedAgent();

    // @ts-expect-error - intentionally invalid input
    await a.stream({ input: { topic: 123 } });

    expect(mockStreamText).not.toHaveBeenCalled();
  });
});

describe("stream() hooks", () => {
  it("fires onStart hook with input", async () => {
    const onStart = vi.fn();
    const a = createSimpleAgent({ onStart });
    await a.stream({ prompt: "hello" });

    expect(onStart).toHaveBeenCalledTimes(1);
    const [firstCall] = onStart.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStart first call");
    }
    expect(firstCall[0]).toEqual({ input: "hello" });
  });

  it("fires onFinish hook after stream completes", async () => {
    const onFinish = vi.fn();
    const a = createSimpleAgent({ onFinish });
    const result = await a.stream({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream to trigger onFinish
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    // Wait for the done promise to settle
    await result.output;

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onFinish first call");
    }
    expect(firstCall[0].input).toBe("hello");
    expect(firstCall[0].result).toHaveProperty("output");
    expect(firstCall[0].duration).toBeGreaterThanOrEqual(0);
  });

  it("fires onStepFinish hook during stream tool loop", async () => {
    const onStepFinish = vi.fn();

    const streamResult = createMockStreamResult();
    mockStreamText.mockImplementation(
      (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        // Simulate step callbacks synchronously before the stream starts
        if (opts.onStepFinish) {
          void opts.onStepFinish({
            toolCalls: [],
            toolResults: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          });
        }
        return streamResult;
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    const result = await a.stream({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    // Allow microtasks to settle
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(onStepFinish).toHaveBeenCalled();
  });

  it("fires onStepFinish with mapped toolCalls and toolResults", async () => {
    const onStepFinish = vi.fn();

    const streamResult = createMockStreamResult();
    mockStreamText.mockImplementation(
      (opts: { onStepFinish?: (step: Record<string, unknown>) => Promise<void> }) => {
        if (opts.onStepFinish) {
          void opts.onStepFinish({
            toolCalls: [{ toolName: "myTool", args: { foo: "bar" } }],
            toolResults: [{ toolName: "myTool", result: { answer: 42 } }],
            usage: { inputTokens: 10, outputTokens: 5 },
          });
        }
        return streamResult;
      },
    );

    const a = createSimpleAgent({ onStepFinish });
    const result = await a.stream({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Drain the stream
    const reader = result.fullStream.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption requires awaiting each read
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }

    // Allow microtasks to settle
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(onStepFinish).toHaveBeenCalledTimes(1);
    const [firstCall] = onStepFinish.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onStepFinish first call");
    }
    expect(firstCall[0].stepId).toBe("test-agent:0");
    expect(firstCall[0].toolCalls).toEqual([{ toolName: "myTool", argsTextLength: 13 }]);
    expect(firstCall[0].toolResults).toEqual([{ toolName: "myTool", resultTextLength: 13 }]);
  });
});

describe("stream() error handling", () => {
  it("returns AGENT_ERROR when streamText throws synchronously", async () => {
    mockStreamText.mockImplementation(() => {
      throw new Error("stream setup failed");
    });

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "test" });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("AGENT_ERROR");
    expect(result.error.message).toBe("stream setup failed");
    expect(result.error.cause).toBeInstanceOf(Error);
  });

  it("fires onError when streamText throws synchronously", async () => {
    mockStreamText.mockImplementation(() => {
      throw new Error("setup fail");
    });

    const onError = vi.fn();
    const a = createSimpleAgent({ onError });
    await a.stream({ prompt: "test" });

    expect(onError).toHaveBeenCalledTimes(1);
    const [firstCall] = onError.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onError first call");
    }
    expect(firstCall[0].error.message).toBe("setup fail");
  });

  it("wraps non-Error throws into Error", async () => {
    mockStreamText.mockImplementation(() => {
      // oxlint-disable-next-line no-throw-literal -- testing non-Error throw handling
      throw "string stream error";
    });

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "test" });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("AGENT_ERROR");
    expect(result.error.message).toBe("string stream error");
  });

  it("does not fire onError on input validation failure", async () => {
    const onError = vi.fn();
    const a = createTypedAgent({ onError });

    // @ts-expect-error - intentionally invalid input
    await a.stream({ input: { topic: 123 } });

    expect(onError).not.toHaveBeenCalled();
  });

  it("does not fire onFinish when streamText throws synchronously", async () => {
    mockStreamText.mockImplementation(() => {
      throw new Error("setup fail");
    });

    const onFinish = vi.fn();
    const a = createSimpleAgent({ onFinish });
    await a.stream({ prompt: "test" });

    expect(onFinish).not.toHaveBeenCalled();
  });
});

describe("stream() overrides", () => {
  it("uses override model when provided", async () => {
    const overrideModel = { modelId: "stream-override" } as never;
    const a = createSimpleAgent();
    await a.stream({ prompt: "test", model: overrideModel });

    const [callArgs] = mockStreamText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected streamText to be called");
    }
    expect(callArgs[0].model).toBe(overrideModel);
  });

  it("passes abort signal from overrides", async () => {
    const controller = new AbortController();
    const a = createSimpleAgent();
    await a.stream({ prompt: "test", signal: controller.signal });

    const [callArgs] = mockStreamText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected streamText to be called");
    }
    expect(callArgs[0].abortSignal).toBe(controller.signal);
  });
});

describe("fn()", () => {
  it("returns a function that delegates to generate()", async () => {
    const a = createSimpleAgent();
    const fn = a.fn();

    const result = await fn({ prompt: "hello" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }
    expect(result.output).toBe("mock response text");
  });

  it("fn() produces the same results as generate()", async () => {
    const a = createSimpleAgent();
    const fn = a.fn();

    const resultGenerate = await a.generate({ prompt: "test" });
    const resultFn = await fn({ prompt: "test" });

    expect(resultGenerate.ok).toBeTruthy();
    expect(resultFn.ok).toBeTruthy();
    if (!resultGenerate.ok || !resultFn.ok) {
      return;
    }
    expect(resultGenerate.output).toEqual(resultFn.output);
  });

  it("fn() passes overrides through to generate", async () => {
    const onStart = vi.fn();
    const a = createSimpleAgent();
    const fn = a.fn();

    await fn({ prompt: "test", onStart });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("fn() handles validation errors", async () => {
    const a = createTypedAgent();
    const fn = a.fn();

    // @ts-expect-error - intentionally invalid input
    const result = await fn({ input: { topic: 123 } });

    expect(result.ok).toBeFalsy();
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("tool integration", () => {
  it("passes tools to generateText when tools are configured", async () => {
    const mockTool = {
      description: "mock tool",
      inputSchema: { jsonSchema: {} },
      execute: vi.fn(),
    };

    const a = createSimpleAgent({ tools: { myTool: mockTool as never } });
    await a.generate({ prompt: "test" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].tools).toBeDefined();
  });

  it("passes no tools to generateText when no tools are configured", async () => {
    const a = createSimpleAgent();
    await a.generate({ prompt: "test" });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].tools).toBeUndefined();
  });

  it("merges override tools with config tools", async () => {
    const configTool = { description: "config", inputSchema: { jsonSchema: {} }, execute: vi.fn() };
    const overrideTool = {
      description: "override",
      inputSchema: { jsonSchema: {} },
      execute: vi.fn(),
    };

    const a = createSimpleAgent({ tools: { configTool: configTool as never } });
    await a.generate({ prompt: "test", tools: { overrideTool: overrideTool as never } });

    const [callArgs] = mockGenerateText.mock.calls;
    if (!callArgs) {
      throw new Error("Expected generateText to be called");
    }
    expect(callArgs[0].tools).toBeDefined();
  });
});

describe("edge cases", () => {
  it("handles undefined overrides gracefully", async () => {
    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "test" });

    expect(result.ok).toBeTruthy();
  });

  it("handles empty string input for simple agent", async () => {
    const a = createSimpleAgent();
    const result = await a.generate({ prompt: "" });

    expect(result.ok).toBeTruthy();
  });

  it("uses default logger when none provided", async () => {
    const a = agent({
      name: "no-logger-agent",
      model: { modelId: "mock" } as never,
      system: "test",
    });

    // Should not throw when no logger is provided
    const result = await a.generate({ prompt: "test" });
    expect(result.ok).toBeTruthy();
  });
});

// oxlint-disable-next-line promise/no-promise-in-callback -- test helper intentionally creates suppressed rejections
function makeSuppressedRejection<T>(error: Error): Promise<T> {
  // oxlint-disable-next-line promise/no-promise-in-callback
  const p = Promise.reject<T>(error);
  // oxlint-disable-next-line promise/no-promise-in-callback
  p.catch(() => {
    // Suppress unhandled rejection warning — the test asserts rejection behavior
  });
  return p;
}

function createErrorStreamResult(error: Error) {
  async function* makeFullStream() {
    yield { type: "text-delta" as const, textDelta: "partial" };
    throw error;
  }

  return {
    fullStream: makeFullStream(),
    text: makeSuppressedRejection<string>(error),
    output: makeSuppressedRejection<unknown>(error),
    response: makeSuppressedRejection<{ messages: unknown[] }>(error),
    totalUsage: makeSuppressedRejection<typeof MOCK_TOTAL_USAGE>(error),
    finishReason: makeSuppressedRejection<string>(error),
  };
}

describe("stream() async error during consumption", () => {
  it("closes the stream when fullStream throws during iteration", async () => {
    const streamError = new Error("async stream failure");
    mockStreamText.mockReturnValue(createErrorStreamResult(streamError));

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    // Suppress derived promise rejections
    result.output.catch(() => {});
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    // Drain the stream — writer.abort() errors the readable side, so
    // Reader.read() will reject once the error propagates.
    const parts: unknown[] = [];
    const reader = result.fullStream.getReader();
    let streamErrored = false;
    for (;;) {
      try {
        // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        parts.push(value);
      } catch {
        streamErrored = true;
        break;
      }
    }

    // Should have received the partial chunk before error closed the stream
    expect(parts.length).toBeGreaterThanOrEqual(1);
    expect(parts[0]).toEqual({ type: "text-delta", textDelta: "partial" });
    expect(streamErrored).toBeTruthy();
  });

  it("fires onError hook when fullStream throws during iteration", async () => {
    const streamError = new Error("async hook error");
    mockStreamText.mockReturnValue(createErrorStreamResult(streamError));

    const onError = vi.fn();
    const onFinish = vi.fn();
    const a = createSimpleAgent({ onError, onFinish });
    const result = await a.stream({ prompt: "test" });

    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    result.output.catch(() => {});
    result.messages.catch(() => {});
    result.usage.catch(() => {});
    result.finishReason.catch(() => {});

    // Drain the stream to trigger the error — reader.read() rejects
    // Once the writer aborts the transform stream.
    const reader = result.fullStream.getReader();
    for (;;) {
      try {
        // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption
        const { done } = await reader.read();
        if (done) {
          break;
        }
      } catch {
        break;
      }
    }

    // Wait for async error handling to settle
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    expect(onError).toHaveBeenCalledTimes(1);
    const [firstCall] = onError.mock.calls;
    if (!firstCall) {
      throw new Error("Expected onError first call");
    }
    expect(firstCall[0].input).toBe("test");
    expect(firstCall[0].error).toBeInstanceOf(Error);
    expect(firstCall[0].error.message).toBe("async hook error");

    // OnFinish should NOT be called when the stream errors
    expect(onFinish).not.toHaveBeenCalled();
  });
});

describe("stream() unhandled rejection safety", () => {
  it("does not emit unhandledRejection when consumer ignores derived promises", async () => {
    const streamError = new Error("derived promise rejection test");

    async function* makeFullStream() {
      yield { type: "text-delta" as const, textDelta: "partial" };
      throw streamError;
    }

    mockStreamText.mockReturnValue({
      fullStream: makeFullStream(),
      text: makeSuppressedRejection<string>(streamError),
      output: makeSuppressedRejection<unknown>(streamError),
      response: makeSuppressedRejection<{ messages: unknown[] }>(streamError),
      totalUsage: makeSuppressedRejection<typeof MOCK_TOTAL_USAGE>(streamError),
      finishReason: makeSuppressedRejection<string>(streamError),
      toTextStreamResponse: vi.fn(() => new Response("")),
      toUIMessageStreamResponse: vi.fn(() => new Response("")),
    });

    const unhandledRejections: unknown[] = [];
    const handler = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on("unhandledRejection", handler);

    try {
      const a = createSimpleAgent();
      const result = await a.stream({ prompt: "test" });

      expect(result.ok).toBeTruthy();
      if (!result.ok) {
        return;
      }

      // Intentionally do NOT .catch() any derived promises (output, messages, usage, finishReason).
      // Before the fix, this would cause unhandled rejection warnings.

      // Drain the stream to trigger the error
      const reader = result.fullStream.getReader();
      for (;;) {
        try {
          // eslint-disable-next-line no-await-in-loop -- Sequential stream consumption
          const { done } = await reader.read();
          if (done) {
            break;
          }
        } catch {
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

// ---------------------------------------------------------------------------
// Stream() response methods
// ---------------------------------------------------------------------------

describe("stream() response methods", () => {
  it("toTextStreamResponse delegates to the AI SDK result", async () => {
    const mockResponse = new Response("mock text");
    const mockToText = vi.fn(() => mockResponse);
    mockStreamText.mockReturnValue({
      ...createMockStreamResult(),
      toTextStreamResponse: mockToText,
    });

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });
    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    const init = { status: 200, headers: { "x-custom": "value" } };
    const response = result.toTextStreamResponse(init);
    expect(mockToText).toHaveBeenCalledWith(init);
    expect(response).toBe(mockResponse);
  });

  it("toUIMessageStreamResponse delegates to the AI SDK result", async () => {
    const mockResponse = new Response("mock ui");
    const mockToUI = vi.fn(() => mockResponse);
    mockStreamText.mockReturnValue({
      ...createMockStreamResult(),
      toUIMessageStreamResponse: mockToUI,
    });

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });
    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    const response = result.toUIMessageStreamResponse();
    expect(mockToUI).toHaveBeenCalledWith(undefined);
    expect(response).toBe(mockResponse);
  });

  it("toTextStreamResponse works with no arguments", async () => {
    const mockResponse = new Response("text");
    const mockToText = vi.fn(() => mockResponse);
    mockStreamText.mockReturnValue({
      ...createMockStreamResult(),
      toTextStreamResponse: mockToText,
    });

    const a = createSimpleAgent();
    const result = await a.stream({ prompt: "hello" });
    expect(result.ok).toBeTruthy();
    if (!result.ok) {
      return;
    }

    const response = result.toTextStreamResponse();
    expect(mockToText).toHaveBeenCalledWith(undefined);
    expect(response).toBe(mockResponse);
  });
});
