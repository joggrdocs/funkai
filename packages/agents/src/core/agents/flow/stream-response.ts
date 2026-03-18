import type { UIMessage, UIMessageStreamOptions } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

import type { StreamPart } from "@/core/agents/base/types.js";

/**
 * Response conversion methods built from a `StreamPart` readable stream.
 *
 * Used by flow agents to provide HTTP response conversion from
 * a manually constructed stream of `StreamPart` events.
 *
 * @internal
 */
export interface StreamResponseMethods {
  toTextStreamResponse(init?: ResponseInit): Response;
  toUIMessageStreamResponse<UI_MESSAGE extends UIMessage = UIMessage>(
    options?: ResponseInit & UIMessageStreamOptions<UI_MESSAGE>,
  ): Response;
}

/**
 * Build `toTextStreamResponse` and `toUIMessageStreamResponse` from
 * a `ReadableStream<StreamPart>`.
 *
 * Both methods consume the underlying stream — only one of
 * `fullStream`, `toTextStreamResponse()`, or `toUIMessageStreamResponse()`
 * should be consumed per result.
 *
 * @param getStream - Thunk returning the readable stream. Called lazily
 *   so the stream is only consumed when a response method is invoked.
 * @returns An object with both response conversion methods.
 *
 * @example
 * ```typescript
 * const { readable, writable } = new TransformStream<StreamPart, StreamPart>();
 * const methods = buildStreamResponseMethods(() => readable);
 *
 * // Use one of these — not both simultaneously:
 * return methods.toTextStreamResponse();
 * // or
 * return methods.toUIMessageStreamResponse();
 * ```
 *
 * @internal
 */
export function buildStreamResponseMethods(
  getStream: () => ReadableStream<StreamPart>,
): StreamResponseMethods {
  return {
    toTextStreamResponse(init?: ResponseInit): Response {
      const encoder = new TextEncoder();
      const textStream = getStream().pipeThrough(
        new TransformStream<StreamPart, Uint8Array>({
          transform(part, controller) {
            if (part.type === "text-delta") {
              controller.enqueue(encoder.encode(part.text));
            }
          },
        }),
      );

      const headers = new Headers(init?.headers);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "text/plain; charset=utf-8");
      }

      return new Response(textStream, {
        ...init,
        headers,
      });
    },

    toUIMessageStreamResponse<UI_MESSAGE extends UIMessage = UIMessage>(
      options?: ResponseInit & UIMessageStreamOptions<UI_MESSAGE>,
    ): Response {
      const source = getStream();

      const stream = createUIMessageStream({
        execute({ writer }) {
          writer.merge(source as ReadableStream);
        },
      });

      return createUIMessageStreamResponse({ stream, ...options });
    },
  };
}
