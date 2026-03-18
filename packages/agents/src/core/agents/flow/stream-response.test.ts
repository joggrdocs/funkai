import { describe, expect, it } from "vitest";
import { simulateReadableStream } from "ai";

import type { StreamPart } from "@/core/agents/base/types.js";

import { buildStreamResponseMethods } from "@/core/agents/flow/stream-response.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTextStream(chunks: string[]): ReadableStream<StreamPart> {
  const parts: StreamPart[] = [
    { type: "text-start", id: "t1" } as StreamPart,
    ...chunks.map(
      (text) => ({ type: "text-delta", id: "t1", text } as unknown as StreamPart),
    ),
    { type: "text-end", id: "t1" } as StreamPart,
    {
      type: "finish",
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10 },
        outputTokens: { total: 5, text: 5 },
      },
    } as unknown as StreamPart,
  ];

  return simulateReadableStream({ chunks: parts, chunkDelayInMs: 0 });
}

async function readResponseText(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

// ---------------------------------------------------------------------------
// toTextStreamResponse
// ---------------------------------------------------------------------------

describe("buildStreamResponseMethods", () => {
  describe("toTextStreamResponse", () => {
    it("streams only text-delta content as UTF-8", async () => {
      const methods = buildStreamResponseMethods(() =>
        createTextStream(["Hello", ", ", "world!"]),
      );

      const response = methods.toTextStreamResponse();
      const text = await readResponseText(response);

      expect(text).toBe("Hello, world!");
    });

    it("sets Content-Type to text/plain", () => {
      const methods = buildStreamResponseMethods(() => createTextStream(["hi"]));

      const response = methods.toTextStreamResponse();

      expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    });

    it("merges custom headers from init", () => {
      const methods = buildStreamResponseMethods(() => createTextStream(["hi"]));

      const response = methods.toTextStreamResponse({
        status: 201,
        headers: { "X-Custom": "value" },
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("X-Custom")).toBe("value");
    });

    it("returns empty body when stream has no text-delta events", async () => {
      const parts: StreamPart[] = [
        {
          type: "finish",
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: { total: 0, noCache: 0 },
            outputTokens: { total: 0, text: 0 },
          },
        } as unknown as StreamPart,
      ];
      const methods = buildStreamResponseMethods(() =>
        simulateReadableStream({ chunks: parts, chunkDelayInMs: 0 }),
      );

      const response = methods.toTextStreamResponse();
      const text = await readResponseText(response);

      expect(text).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // toUIMessageStreamResponse
  // ---------------------------------------------------------------------------

  describe("toUIMessageStreamResponse", () => {
    it("returns a Response object", () => {
      const methods = buildStreamResponseMethods(() =>
        createTextStream(["Hello"]),
      );

      const response = methods.toUIMessageStreamResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.body).toBeTruthy();
    });

    it("accepts custom response init options", () => {
      const methods = buildStreamResponseMethods(() =>
        createTextStream(["Hello"]),
      );

      const response = methods.toUIMessageStreamResponse({
        status: 201,
        headers: { "X-Custom": "test" },
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("X-Custom")).toBe("test");
    });

    it("produces a readable stream body", async () => {
      const methods = buildStreamResponseMethods(() =>
        createTextStream(["Hello", " world"]),
      );

      const response = methods.toUIMessageStreamResponse();
      const text = await readResponseText(response);

      // The UI message stream format is SSE-like — verify it contains our text
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain("Hello");
      expect(text).toContain("world");
    });
  });
});
