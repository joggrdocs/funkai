import { openai } from "@ai-sdk/openai";
import { agent, flowAgent, tool } from "@funkai/agents";
import type { Message } from "@funkai/agents";
import { z } from "zod";

// ---------------------------------------------------------------------------
// 1. Agent streaming with fullStream
//
// The agent's `fullStream` emits typed `StreamPart` events — text deltas,
// tool calls, tool results, step boundaries, and finish events. Use
// `part.type` to discriminate between event types.
// ---------------------------------------------------------------------------

const lookupTool = tool({
  description: "Look up the capital of a country",
  inputSchema: z.object({
    country: z.string().describe("Country name"),
  }),
  execute: async (input) => {
    const capitals: Record<string, string> = {
      France: "Paris",
      Japan: "Tokyo",
      Brazil: "Brasília",
      Australia: "Canberra",
    };
    return { capital: capitals[input.country] ?? "Unknown" };
  },
});

const geographyAgent = agent({
  name: "geography",
  model: openai("gpt-4o-mini"),
  system:
    "You are a geography expert. Use the lookup-capital tool to answer questions about capitals.",
  tools: { "lookup-capital": lookupTool },

  // --- Observe tool calls as they happen during streaming ---
  onStepFinish: ({ stepId, toolCalls, toolResults, usage }) => {
    if (toolCalls && toolCalls.length > 0) {
      console.log(`\n[step ${stepId}] Tool calls:`);
      for (const tc of toolCalls) {
        console.log(`  → ${tc.toolName} (input: ${JSON.stringify(tc.input)})`);
      }
    }
    if (toolResults && toolResults.length > 0) {
      console.log(`[step ${stepId}] Tool results:`);
      for (const tr of toolResults) {
        console.log(`  ← ${tr.toolName} (output: ${JSON.stringify(tr.output)})`);
      }
    }
    if (
      usage &&
      ((usage.totalTokens ?? 0) > 0 ||
        (usage.inputTokens ?? 0) > 0 ||
        (usage.outputTokens ?? 0) > 0)
    ) {
      console.log(
        `[step ${stepId}] Tokens: ${usage.inputTokens ?? 0} in / ${usage.outputTokens ?? 0} out`,
      );
    }
  },
});

console.log("=== Agent Streaming with Tool Calls ===\n");

const streamResult = await geographyAgent.stream({
  prompt: "What are the capitals of France and Japan? Answer in a single sentence.",
});

if (streamResult.ok) {
  // Consume typed stream events as they arrive
  process.stdout.write("Response: ");
  for await (const part of streamResult.fullStream) {
    switch (part.type) {
      case "text-delta":
        process.stdout.write(part.text);
        break;
      case "tool-call":
        console.log(`\n  [tool-call] ${part.toolName}(${JSON.stringify(part.input)})`);
        break;
      case "tool-result":
        console.log(`  [tool-result] ${part.toolName} → ${JSON.stringify(part.output)}`);
        break;
      case "finish":
        console.log(`\n  [finish] reason: ${part.finishReason}`);
        break;
      case "error":
        console.error(`  [error]`, part.error);
        break;
    }
  }
  console.log();

  const usage = await streamResult.usage;
  console.log(
    `Total usage: ${usage.inputTokens} in / ${usage.outputTokens} out / ${usage.totalTokens} total`,
  );
} else {
  console.error("Error:", streamResult.error);
}

// ---------------------------------------------------------------------------
// 2. Flow agent streaming — typed StreamPart events
//
// When a flow agent streams, each `$` step emits typed `tool-call` and
// `tool-result` events. `$.agent({ stream: true })` pipes the sub-agent's
// `text-delta` events through the flow's stream. A `finish` event is
// emitted when the flow completes.
// ---------------------------------------------------------------------------

console.log("\n=== Flow Agent Streaming ===\n");

const researcher = agent({
  name: "researcher",
  model: openai("gpt-4o-mini"),
  system: "Answer questions concisely in one sentence.",
});

const researchFlow = flowAgent(
  {
    name: "research-flow",
    input: z.object({ topics: z.array(z.string()) }),
    output: z.object({
      findings: z.array(z.object({ topic: z.string(), answer: z.string() })),
    }),

    // Observe each $ step in real time
    onStepStart: ({ stepId, stepOperation }) => {
      console.log(`[step:start] ${stepId} (type: ${stepOperation})`);
    },
    onStepFinish: ({ stepId, duration }) => {
      console.log(`[step:finish] ${stepId} (${duration}ms)`);
    },
  },
  async ({ input, $ }) => {
    // $.map runs all topics in parallel, each as a tracked step
    const mapResult = await $.map({
      id: "research-topics",
      input: input.topics,
      execute: async ({ item }) => {
        // stream: true pipes the sub-agent's text through the flow's stream
        const result = await $.agent({
          id: `research-${item}`,
          agent: researcher,
          input: `What is ${item}?`,
          stream: true,
        });

        if (!result.ok) {
          return { topic: item, answer: `Error: ${result.error.message}` };
        }

        return { topic: item, answer: String(result.output) };
      },
    });

    if (!mapResult.ok) {
      throw new Error(`Research failed: ${mapResult.error.message}`);
    }

    return { findings: mapResult.output };
  },
);

const flowResult = await researchFlow.stream({
  input: { topics: ["TypeScript", "Rust", "Go"] },
});

if (flowResult.ok) {
  // Consume typed stream events from the flow
  for await (const part of flowResult.fullStream) {
    switch (part.type) {
      case "text-delta":
        process.stdout.write(part.text);
        break;
      case "tool-call":
        console.log(`  [step] ${part.toolName} started`);
        break;
      case "tool-result":
        console.log(`  [step] ${part.toolName} completed`);
        break;
      case "finish":
        console.log(`\nDone: ${part.finishReason}`);
        break;
      case "error":
        console.error("Error:", part.error);
        break;
    }
  }

  const output = await flowResult.output;
  console.log("\nFindings:", JSON.stringify(output, null, 2));

  const messages: Message[] = await flowResult.messages;
  console.log(
    `\nFlow produced ${messages.length} messages (including synthetic tool-call/result pairs for each step)`,
  );
} else {
  console.error("Error:", flowResult.error);
}
