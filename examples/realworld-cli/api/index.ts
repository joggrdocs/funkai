import dotenv from "dotenv";

dotenv.config({ quiet: true });
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import type { AnalyzeEvent } from "../shared/types.js";
import { createPipeline } from "./pipeline.js";
import { createLsTool, createGrepTool, createReadFileTool } from "./tools.js";
import type { RemoteExecutor } from "./tools.js";

const app = new Hono();

// ---------------------------------------------------------------------------
// Pending tool calls — keyed by callId, resolved when CLI posts back
// ---------------------------------------------------------------------------

const pendingCalls = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

let callCounter = 0;

// ---------------------------------------------------------------------------
// POST /tool-result — CLI posts tool execution results here
// ---------------------------------------------------------------------------

const toolResultSchema = z.object({
  callId: z.string(),
  output: z.unknown(),
  error: z.string().optional(),
});

app.post("/tool-result", async (c) => {
  const body = await c.req.json();
  const parsed = toolResultSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const pending = pendingCalls.get(parsed.data.callId);
  if (!pending) {
    return c.json({ error: `No pending call: ${parsed.data.callId}` }, 404);
  }

  pendingCalls.delete(parsed.data.callId);

  if (parsed.data.error) {
    pending.reject(new Error(parsed.data.error));
  } else {
    pending.resolve(parsed.data.output);
  }

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /analyze — starts the pipeline, streams events via SSE
// ---------------------------------------------------------------------------

const analyzeInputSchema = z.object({
  targetDir: z.string(),
});

app.post("/analyze", async (c) => {
  const body = await c.req.json();
  const parsed = analyzeInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  return streamSSE(c, async (stream) => {
    let eventId = 0;

    const emit = (event: AnalyzeEvent): void => {
      stream
        .writeSSE({
          id: String(eventId++),
          event: event.type,
          data: JSON.stringify(event),
        })
        .catch(() => {});
    };

    // Create a remote executor — sends tool-execute SSE event, waits for
    // the CLI to POST back the result to /tool-result.
    const remoteExecute: RemoteExecutor = (toolName, input) => {
      const callId = `call-${callCounter++}`;

      return new Promise<unknown>((resolve, reject) => {
        pendingCalls.set(callId, { resolve, reject });
        emit({ type: "tool-execute", callId, toolName, input });
      });
    };

    const tools = {
      ls: createLsTool(remoteExecute),
      grep: createGrepTool(remoteExecute),
      "read-file": createReadFileTool(remoteExecute),
    } as const;

    const pipeline = createPipeline(tools, emit);

    const result = await pipeline.stream({ targetDir: parsed.data.targetDir });

    if (!result.ok) {
      emit({ type: "error", message: result.error.message });
      return;
    }

    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta":
          emit({ type: "text-delta", text: part.text });
          break;
        case "tool-call":
          emit({
            type: "tool-call",
            toolName: part.toolName,
            input: JSON.stringify(part.input),
          });
          break;
        case "error":
          emit({ type: "error", message: String(part.error) });
          break;
      }
    }

    const output = await result.output;

    await stream.writeSSE({
      id: String(eventId++),
      event: "done",
      data: JSON.stringify({
        type: "done",
        scannedFiles: output.scannedFiles,
        totalIssues: output.totalIssues,
      }),
    });
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? 4321);

const { serve } = await import("@hono/node-server");

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
