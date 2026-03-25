# Quick Start

## Installation

```bash
pnpm add @funkai/agents @ai-sdk/openai
```

Set your API key:

```bash
export OPENAI_API_KEY=sk-...
```

## 1. Create a simple agent

```typescript
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const assistant = agent({
  name: "assistant",
  model: openai("gpt-4.1"),
  system: "You are a helpful assistant.",
});

const result = await assistant.generate({ prompt: "What is TypeScript?" });

if (!result.ok) {
  console.error(result.error.code, result.error.message);
  process.exit(1);
}

console.log(result.output);
// result.usage.totalTokens, result.messages, result.finishReason
```

## 2. Add tools

```typescript
import { agent, tool } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch a web page by URL",
  inputSchema: z.object({ url: z.string().url() }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  },
});

const researcher = agent({
  name: "researcher",
  model: openai("gpt-4.1"),
  system: "You research topics by fetching web pages.",
  tools: { fetchPage },
});

const result = await researcher.generate({ prompt: "Summarize https://example.com" });

if (result.ok) {
  console.log(result.output);
}
```

## 3. Multi-step orchestration with flowAgent

```typescript
import { agent, flowAgent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Write a short explanation of: ${input.topic}`,
});

const reviewer = agent({
  name: "reviewer",
  model: openai("gpt-4.1"),
  input: z.object({ draft: z.string() }),
  prompt: ({ input }) => `Review and improve this text:\n\n${input.draft}`,
});

const pipeline = flowAgent(
  {
    name: "write-and-review",
    input: z.object({ topic: z.string() }),
    output: z.object({ final: z.string() }),
  },
  async ({ input, $ }) => {
    // Step 1: Write a draft
    const draft = await $.agent({
      id: "write-draft",
      agent: writer,
      input: { topic: input.topic },
    });

    if (!draft.ok) {
      return { final: "Failed to generate draft." };
    }

    // Step 2: Review and improve
    const reviewed = await $.agent({
      id: "review-draft",
      agent: reviewer,
      input: { draft: draft.output },
    });

    if (reviewed.ok) {
      return { final: reviewed.output };
    }
    return { final: draft.output };
  },
);

const result = await pipeline.generate({ topic: "pattern matching in TypeScript" });

if (result.ok) {
  console.log(result.output.final);
  console.log("Trace:", result.trace);
  console.log("Duration:", result.duration, "ms");
}
```

## Streaming

Both `agent()` and `flowAgent()` support streaming via `.stream()`:

```typescript
const result = await assistant.stream({ prompt: "Explain closures in JavaScript" });

if (result.ok) {
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      process.stdout.write(part.textDelta);
    }
  }
}
```
