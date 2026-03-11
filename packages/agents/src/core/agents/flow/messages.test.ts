import { describe, expect, it } from "vitest";

import {
  buildToolCallId,
  collectTextFromMessages,
  createAssistantMessage,
  createToolCallMessage,
  createToolResultMessage,
  createUserMessage,
} from "@/core/agents/flow/messages.js";

// ---------------------------------------------------------------------------
// buildToolCallId
// ---------------------------------------------------------------------------

describe("buildToolCallId", () => {
  it("concatenates stepId and index with a dash", () => {
    expect(buildToolCallId("scan-repo", 0)).toBe("scan-repo-0");
    expect(buildToolCallId("write-doc", 3)).toBe("write-doc-3");
  });
});

// ---------------------------------------------------------------------------
// createToolCallMessage
// ---------------------------------------------------------------------------

describe("createToolCallMessage", () => {
  it("returns an assistant message with a tool-call content part", () => {
    const msg = createToolCallMessage("call-1", "my-step", { x: 42 });

    expect(msg.role).toBe("assistant");
    expect(msg.content).toEqual([
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "my-step",
        input: { x: 42 },
      },
    ]);
  });

  it("defaults input to {} when null/undefined", () => {
    const msg = createToolCallMessage("call-1", "step", undefined);

    const part = (msg.content as Array<{ input: unknown }>)[0];
    expect(part?.input).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// createToolResultMessage
// ---------------------------------------------------------------------------

describe("createToolResultMessage", () => {
  it("returns a tool message with a tool-result content part", () => {
    const msg = createToolResultMessage("call-1", "my-step", { result: "ok" });

    expect(msg.role).toBe("tool");
    expect(msg.content).toEqual([
      {
        type: "tool-result",
        toolCallId: "call-1",
        toolName: "my-step",
        output: { result: "ok" },
      },
    ]);
  });

  it("includes isError when true", () => {
    const msg = createToolResultMessage("call-1", "step", "failed", true);

    const part = (msg.content as Array<Record<string, unknown>>)[0];
    expect(part?.isError).toBe(true);
  });

  it("omits isError when falsy", () => {
    const msg = createToolResultMessage("call-1", "step", "ok");

    const part = (msg.content as Array<Record<string, unknown>>)[0];
    expect(part?.isError).toBeUndefined();
  });

  it("defaults output to empty object when undefined", () => {
    const msg = createToolResultMessage("call-1", "step", undefined);

    const part = (msg.content as Array<{ output: unknown }>)[0];
    expect(part?.output).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// createUserMessage
// ---------------------------------------------------------------------------

describe("createUserMessage", () => {
  it("creates a user message from a string input", () => {
    const msg = createUserMessage("hello world");

    expect(msg.role).toBe("user");
    expect(msg.content).toBe("hello world");
  });

  it("JSON-stringifies non-string input", () => {
    const msg = createUserMessage({ topic: "TypeScript" });

    expect(msg.role).toBe("user");
    expect(msg.content).toBe('{"topic":"TypeScript"}');
  });

  it("does not throw for non-serializable input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => createUserMessage(circular)).not.toThrow();
    expect(createUserMessage(circular).role).toBe("user");
  });

  it('serializes undefined input as "null"', () => {
    const msg = createUserMessage(undefined);

    expect(msg.role).toBe("user");
    expect(msg.content).toBe("null");
  });
});

// ---------------------------------------------------------------------------
// createAssistantMessage
// ---------------------------------------------------------------------------

describe("createAssistantMessage", () => {
  it("creates an assistant message from a string output", () => {
    const msg = createAssistantMessage("response text");

    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe("response text");
  });

  it("JSON-stringifies non-string output", () => {
    const msg = createAssistantMessage({ docs: ["a", "b"] });

    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe('{"docs":["a","b"]}');
  });

  it("does not throw for non-serializable output", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => createAssistantMessage(circular)).not.toThrow();
    expect(createAssistantMessage(circular).role).toBe("assistant");
  });
});

// ---------------------------------------------------------------------------
// collectTextFromMessages
// ---------------------------------------------------------------------------

describe("collectTextFromMessages", () => {
  it("collects text from assistant messages with string content", () => {
    const messages = [
      { role: "user" as const, content: "hello" },
      { role: "assistant" as const, content: "response 1" },
      { role: "assistant" as const, content: "response 2" },
    ];

    expect(collectTextFromMessages(messages)).toBe("response 1\nresponse 2");
  });

  it("ignores non-assistant messages", () => {
    const messages = [
      { role: "user" as const, content: "hello" },
      {
        role: "tool" as const,
        content: [{ type: "tool-result" as const, toolCallId: "1", toolName: "t", output: "ok" }],
      } as never,
    ];

    expect(collectTextFromMessages(messages)).toBe("");
  });

  it("ignores assistant messages with non-string content", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "tool-call" as const, toolCallId: "1", toolName: "t", input: {} },
        ] as never,
      },
      { role: "assistant" as const, content: "text part" },
    ];

    expect(collectTextFromMessages(messages)).toBe("text part");
  });

  it("returns empty string for empty messages array", () => {
    expect(collectTextFromMessages([])).toBe("");
  });
});
