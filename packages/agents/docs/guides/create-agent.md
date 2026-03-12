# Create an Agent

## Prerequisites

- `@pkg/agent-sdk` installed
- `OPENROUTER_API_KEY` environment variable set
- Familiarity with Zod schemas (for typed agents)

## Steps

### 1. Create a simple agent

Pass a `name`, `model`, and optional `system` prompt. In simple mode, `.generate()` accepts a raw `string` or `Message[]`.

```ts
import { agent } from "@pkg/agent-sdk";

const helper = agent({
  name: "helper",
  model: "openai/gpt-4.1",
  system: "You are a helpful assistant.",
});

const result = await helper.generate("What is TypeScript?");
if (result.ok) {
  console.log(result.output); // string
}
```

### 2. Create a typed agent

Add an `input` Zod schema and a `prompt` function. Both are required together. `.generate()` now accepts the typed input.

```ts
import { agent } from "@pkg/agent-sdk";
import { z } from "zod";

const summarizer = agent({
  name: "summarizer",
  model: "openai/gpt-4.1",
  input: z.object({
    text: z.string(),
    maxLength: z.number().optional(),
  }),
  prompt: ({ input }) =>
    `Summarize the following text${input.maxLength ? ` in under ${input.maxLength} words` : ""}:\n\n${input.text}`,
  system: "You produce concise summaries.",
});

const result = await summarizer.generate({
  text: "A very long article...",
  maxLength: 100,
});
```

### 3. Add tools

Pass a `tools` record. Tool names come from the object keys. See [Create a Tool](create-tool.md).

```ts
import { agent, tool } from "@pkg/agent-sdk";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch a web page by URL",
  inputSchema: z.object({ url: z.url() }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  },
});

const researcher = agent({
  name: "researcher",
  model: "openai/gpt-4.1",
  system: "You research topics by fetching web pages.",
  tools: { fetchPage },
});
```

### 4. Add subagents

Pass an `agents` record. Each subagent is auto-wrapped as a delegatable tool. Abort signals propagate from parent to child.

```ts
const writer = agent({
  name: "writer",
  model: "openai/gpt-4.1",
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Write an article about ${input.topic}`,
});

const editor = agent({
  name: "editor",
  model: "openai/gpt-4.1",
  system: "You review and improve articles. Delegate writing to the writer agent.",
  agents: { writer },
});
```

### 5. Use structured output

Pass an `output` config to get typed structured output instead of a string. Accepts AI SDK `Output` strategies or raw Zod schemas.

```ts
import { Output } from "ai";

// Zod schema auto-wrapped as Output.object()
const classifier = agent({
  name: "classifier",
  model: "openai/gpt-4.1",
  output: z.object({
    category: z.enum(["bug", "feature", "question"]),
    confidence: z.number(),
  }),
  input: z.object({ title: z.string(), body: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\nTitle: ${input.title}\nBody: ${input.body}`,
});

// Or use Output directly
const tagger = agent({
  name: "tagger",
  model: "openai/gpt-4.1",
  output: Output.array({ element: z.object({ tag: z.string(), score: z.number() }) }),
  system: "Extract tags from the text.",
});
```

### 6. Stream output

Use `.stream()` for incremental text delivery. The result contains a `ReadableStream<string>` for live chunks, plus `output` and `messages` as promises that resolve after the stream completes.

```ts
const result = await helper.stream("Explain async/await in detail");

if (result.ok) {
  // Consume text chunks as they arrive
  const reader = result.stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(value);
  }

  // Await final output and messages after stream completes
  const finalOutput = await result.output;
  const messages = await result.messages;
}
```

### 7. Export as a plain function

Use `.fn()` for clean single-function exports.

```ts
export const summarize = summarizer.fn();

// Callers use it like a regular async function
const result = await summarize({ text: "...", maxLength: 50 });
```

### 8. Handle cancellation

Pass an `AbortController` signal via per-call overrides.

```ts
const controller = new AbortController();

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10_000);

const result = await helper.generate("Explain quantum computing", {
  signal: controller.signal,
});

if (!result.ok) {
  console.error(result.error.code); // 'AGENT_ERROR'
}
```

### 9. Use per-call overrides

Override model, system prompt, tools, output, and hooks for a single call without changing the agent definition.

```ts
const result = await helper.generate("Explain monads", {
  model: "anthropic/claude-sonnet-4-20250514",
  system: "You explain concepts using simple analogies.",
  maxSteps: 5,
  onStart: ({ input }) => console.log("Starting with:", input),
  onFinish: ({ result, duration }) => console.log(`Done in ${duration}ms`),
});
```

## Verification

- `result.ok` is `true` on success
- `result.output` contains the agent's response (string or typed object)
- `result.messages` contains the full message history including tool calls

## Troubleshooting

### OPENROUTER_API_KEY not set

**Fix:** Set the `OPENROUTER_API_KEY` environment variable in your `.env` file or shell environment.

### Agent has `input` schema but no `prompt` function

**Fix:** Provide both `input` and `prompt`, or omit both for simple mode.

### Agent has `prompt` function but no `input` schema

**Fix:** Provide both `input` and `prompt`, or omit both for simple mode.

### Input validation failed

**Fix:** Check that the input matches the Zod schema. Ensure all required fields are present and types are correct.

## References

- [Create a Tool](create-tool.md)
- [Create a Workflow](create-workflow.md)
- [Provider Overview](../provider/overview.md)
- [Troubleshooting](../troubleshooting.md)
