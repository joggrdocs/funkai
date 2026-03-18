import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Message } from "@/core/agents/base/types.js";
import {
  buildAITools,
  buildPrompt,
  resolveSystem,
  toTokenUsage,
} from "@/core/agents/base/utils.js";
import { RUNNABLE_META } from "@/lib/runnable.js";

describe(resolveSystem, () => {
  it("returns undefined when system is undefined", () => {
    expect(resolveSystem(undefined, "input")).toBeUndefined();
  });

  it("returns undefined when system is null", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveSystem(null as any, "input")).toBeUndefined();
  });

  it("returns a static string as-is", () => {
    expect(resolveSystem("You are helpful", "input")).toBe("You are helpful");
  });

  it("calls function system with input and returns the result", () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping -- Test helper intentionally scoped within test case for locality
    const system = ({ input }: { input: string }) => `System for ${input}`;
    expect(resolveSystem(system, "topic")).toBe("System for topic");
  });
});

describe(buildPrompt, () => {
  it("returns { prompt } for a simple string input", () => {
    const result = buildPrompt("hello", {});
    expect(result).toEqual({ prompt: "hello" });
  });

  it("returns { messages } for a non-string input without typed config", () => {
    const messages: Message[] = [{ role: "user", content: "hi" }];
    const result = buildPrompt(messages, {});
    expect(result).toEqual({ messages });
  });

  it("returns { prompt } for typed mode returning a string", () => {
    const result = buildPrompt(
      { topic: "AI" },
      {
        input: z.object({ topic: z.string() }),
        prompt: ({ input }) => `Tell me about ${input.topic}`,
      },
    );
    expect(result).toEqual({ prompt: "Tell me about AI" });
  });

  it("returns { messages } for typed mode returning messages array", () => {
    const messages: Message[] = [{ role: "user", content: "hello" }];
    const result = buildPrompt(
      { topic: "AI" },
      {
        input: z.object({ topic: z.string() }),
        prompt: () => messages,
      },
    );
    expect(result).toEqual({ messages });
  });

  it("throws when input schema is provided without prompt function", () => {
    expect(() => buildPrompt("test", { input: z.string() })).toThrow(
      "Agent has `input` schema but no `prompt` function",
    );
  });

  it("throws when prompt function is provided without input schema", () => {
    expect(() => buildPrompt("test", { prompt: ({ input }) => `${input}` })).toThrow(
      "Agent has `prompt` function but no `input` schema",
    );
  });
});

describe(toTokenUsage, () => {
  it("converts a fully populated LanguageModelUsage to TokenUsage", () => {
    const result = toTokenUsage({
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
    });

    expect(result).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 10,
      cacheWriteTokens: 5,
      reasoningTokens: 3,
    });
  });

  it("defaults undefined top-level fields to 0", () => {
    const result = toTokenUsage({
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
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

    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.totalTokens).toBe(0);
  });

  it("defaults undefined detail fields to 0", () => {
    const result = toTokenUsage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
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

    expect(result.cacheReadTokens).toBe(0);
    expect(result.cacheWriteTokens).toBe(0);
    expect(result.reasoningTokens).toBe(0);
  });

  it("extracts cache tokens from inputTokenDetails", () => {
    const result = toTokenUsage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputTokenDetails: {
        noCacheTokens: 90,
        cacheReadTokens: 10,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: 50,
        reasoningTokens: undefined,
      },
    });

    expect(result.cacheReadTokens).toBe(10);
    expect(result.cacheWriteTokens).toBe(0);
  });

  it("extracts reasoning tokens from outputTokenDetails", () => {
    const result = toTokenUsage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputTokenDetails: {
        noCacheTokens: 100,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: 42,
        reasoningTokens: 8,
      },
    });

    expect(result.reasoningTokens).toBe(8);
  });

  it("defaults cache tokens to 0 when inputTokenDetails is undefined", () => {
    const result = toTokenUsage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputTokenDetails: undefined as never,
      outputTokenDetails: {
        textTokens: 50,
        reasoningTokens: 0,
      },
    });

    expect(result.cacheReadTokens).toBe(0);
    expect(result.cacheWriteTokens).toBe(0);
  });

  it("defaults reasoning tokens to 0 when outputTokenDetails is undefined", () => {
    const result = toTokenUsage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputTokenDetails: {
        noCacheTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      outputTokenDetails: undefined as never,
    });

    expect(result.reasoningTokens).toBe(0);
  });
});

describe(buildAITools, () => {
  it("returns undefined when no tools or agents are provided", () => {
    expect(buildAITools()).toBeUndefined();
    expect(buildAITools(undefined, undefined)).toBeUndefined();
  });

  it("returns undefined for empty tool and agent records", () => {
    expect(buildAITools({}, {})).toBeUndefined();
  });

  it("returns tools when only tools are provided", () => {
    const tools = { myTool: { description: "test" } as never };
    const result = buildAITools(tools);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("myTool");
  });

  it("wraps agents without inputSchema into prompt-based tools", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    const result = buildAITools(undefined, { sub: mockAgent as never });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("agent_sub");
    const tools = result as Record<string, Record<string, unknown>>;
    expect(tools["agent_sub"]).toHaveProperty("description");
    expect(tools["agent_sub"]).toHaveProperty("execute");
  });

  it("wraps agents with inputSchema using the schema", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
      [RUNNABLE_META]: {
        name: "custom-name",
        inputSchema: z.object({ query: z.string() }),
      },
    };
    const result = buildAITools(undefined, { sub: mockAgent as never });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("agent_sub");
    const tools = result as Record<
      string,
      { description: string; execute: (...args: unknown[]) => unknown }
    >;
    expect(tools["agent_sub"]).toHaveProperty("description");
    // Description should use meta name
    expect(tools["agent_sub"].description).toContain("custom-name");
  });

  it("uses fallback name when agent has no RUNNABLE_META name", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    const result = buildAITools(undefined, { fallbackKey: mockAgent as never });

    expect(result).toBeDefined();
    const tools = result as Record<
      string,
      { description: string; execute: (...args: unknown[]) => unknown }
    >;
    expect(tools["agent_fallbackKey"].description).toContain("fallbackKey");
  });

  it("throws on agent key with dashes", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    expect(() => buildAITools(undefined, { "my-agent": mockAgent as never })).toThrow(
      /Invalid sub-agent key "my-agent"/,
    );
  });

  it("throws on agent key with dots", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    expect(() => buildAITools(undefined, { "my.agent": mockAgent as never })).toThrow(
      /Invalid sub-agent key "my\.agent"/,
    );
  });

  it("throws on agent key with colons", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    expect(() => buildAITools(undefined, { "my:agent": mockAgent as never })).toThrow(
      /Invalid sub-agent key "my:agent"/,
    );
  });

  it("accepts camelCase agent keys", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    const result = buildAITools(undefined, { myAgent: mockAgent as never });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("agent_myAgent");
  });

  it("accepts snake_case agent keys", () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    const result = buildAITools(undefined, { my_agent: mockAgent as never });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("agent_my_agent");
  });

  it("merges tools and agents together", () => {
    const tools = { myTool: { description: "test" } as never };
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "result" }),
    };
    const result = buildAITools(tools, { sub: mockAgent as never });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("myTool");
    expect(result).toHaveProperty("agent_sub");
  });

  it("execute calls generate on prompt-based agent and returns output", async () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "agent-output" }),
    };
    const result = buildAITools(undefined, { sub: mockAgent as never });
    expect(result).toBeDefined();

    const tools = result as Record<
      string,
      { description: string; execute: (...args: unknown[]) => unknown }
    >;
    const output = await tools["agent_sub"].execute(
      { prompt: "hello" },
      { toolCallId: "tc-1", messages: [] },
    );
    expect(output).toBe("agent-output");
    expect(mockAgent.generate).toHaveBeenCalledWith("hello", { signal: undefined });
  });

  it("execute throws when prompt-based agent returns error", async () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: false, error: { message: "agent failed" } }),
    };
    const result = buildAITools(undefined, { sub: mockAgent as never });
    expect(result).toBeDefined();

    const tools = result as Record<
      string,
      { description: string; execute: (...args: unknown[]) => unknown }
    >;
    await expect(
      tools["agent_sub"].execute({ prompt: "hello" }, { toolCallId: "tc-1", messages: [] }),
    ).rejects.toThrow("agent failed");
  });

  it("execute calls generate on typed agent with inputSchema and returns output", async () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: true, output: "typed-output" }),
      [RUNNABLE_META]: {
        name: "typed-agent",
        inputSchema: z.object({ query: z.string() }),
      },
    };
    const result = buildAITools(undefined, { sub: mockAgent as never });
    expect(result).toBeDefined();

    const tools = result as Record<
      string,
      { description: string; execute: (...args: unknown[]) => unknown }
    >;
    const output = await tools["agent_sub"].execute(
      { query: "test" },
      { toolCallId: "tc-1", messages: [] },
    );
    expect(output).toBe("typed-output");
    expect(mockAgent.generate).toHaveBeenCalledWith({ query: "test" }, { signal: undefined });
  });

  it("execute throws when typed agent returns error", async () => {
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ ok: false, error: { message: "typed failed" } }),
      [RUNNABLE_META]: {
        name: "typed-agent",
        inputSchema: z.object({ query: z.string() }),
      },
    };
    const result = buildAITools(undefined, { sub: mockAgent as never });
    expect(result).toBeDefined();

    const tools = result as Record<
      string,
      { description: string; execute: (...args: unknown[]) => unknown }
    >;
    await expect(
      tools["agent_sub"].execute({ query: "test" }, { toolCallId: "tc-1", messages: [] }),
    ).rejects.toThrow("typed failed");
  });
});
