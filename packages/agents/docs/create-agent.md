# Create an Agent

`agent()` creates an `Agent` that wraps the AI SDK's tool loop (`generateText`/`streamText`) with typed input, subagents, hooks, and `Result` return types.

## Simple agent

Pass a `name`, `model`, and optional `system` prompt. In simple mode, `.generate()` accepts a `{ prompt }` object or a `Message[]`.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const helper = agent({
  name: "helper",
  model: openai("gpt-4.1"),
  system: "You are a helpful assistant.",
});

const result = await helper.generate({ prompt: "What is TypeScript?" });
if (result.ok) {
  console.log(result.output); // string
}
```

On success, `result.ok` is `true` and `result.output`, `result.messages`, and `result.usage` are available. On failure, `result.ok` is `false` and `result.error` contains a `ResultError`.

## Typed I/O

Add an `input` Zod schema and a `prompt` function. Both are required together — providing one without the other is a type error. `.generate()` now accepts the typed input directly.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const summarizer = agent({
  name: "summarizer",
  model: openai("gpt-4.1"),
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

## Tools

Pass a `tools` record. Tool names come from the object keys. See [Tools](tools.md).

```ts
import { agent, tool } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
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
  model: openai("gpt-4.1"),
  system: "You research topics by fetching web pages.",
  tools: { fetchPage },
});
```

## Subagents

Pass an `agents` record. Each subagent is automatically wrapped as a delegatable tool the parent agent can invoke through function calling. Abort signals propagate from parent to child.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Write an article about ${input.topic}`,
});

const editor = agent({
  name: "editor",
  model: openai("gpt-4.1"),
  system: "You review and improve articles. Delegate writing to the writer agent.",
  agents: { writer },
});
```

## Output strategies

Pass an `output` config to get typed structured output instead of a plain string. Accepts AI SDK `Output` strategies or raw Zod schemas (auto-wrapped).

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { Output } from "ai";
import { z } from "zod";

// Zod schema — auto-wrapped as Output.object()
const classifier = agent({
  name: "classifier",
  model: openai("gpt-4.1"),
  output: z.object({
    category: z.enum(["bug", "feature", "question"]),
    confidence: z.number(),
  }),
  input: z.object({ title: z.string(), body: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\nTitle: ${input.title}\nBody: ${input.body}`,
});

// Output.array() directly
const tagger = agent({
  name: "tagger",
  model: openai("gpt-4.1"),
  output: Output.array({ element: z.object({ tag: z.string(), score: z.number() }) }),
  system: "Extract tags from the text.",
});
```

Accepted output values:

| Value                        | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `Output.text()`              | Plain string (default when omitted)         |
| `Output.object({ schema })`  | Validated structured object                 |
| `Output.array({ element })`  | Validated array                             |
| `Output.choice({ options })` | Enum/classification                         |
| `z.object({ ... })`          | Auto-wrapped as `Output.object({ schema })` |
| `z.array(z.object({ ... }))` | Auto-wrapped as `Output.array({ element })` |

## Streaming

Use `.stream()` for incremental text delivery. The result contains `fullStream` (a `ReadableStream<string>`) for live chunks, plus `output` and `messages` as promises that resolve after the stream completes.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const helper = agent({
  name: "helper",
  model: openai("gpt-4.1"),
  system: "You are a helpful assistant.",
});

const result = await helper.stream({ prompt: "Explain async/await in detail" });

if (result.ok) {
  // Consume text chunks as they arrive
  for await (const chunk of result.fullStream) {
    process.stdout.write(chunk);
  }

  // Await final output and messages after stream completes
  const finalOutput = await result.output;
  const messages = await result.messages;
}
```

## Per-call overrides

Override model, system prompt, tools, output, and hooks for a single call without changing the agent definition. Per-call hooks **merge** with base hooks — base fires first, then call-level.

```ts
import { anthropic } from "@ai-sdk/anthropic";

const result = await helper.generate({
  prompt: "Explain monads",
  model: anthropic("claude-sonnet-4-20250514"),
  system: "You explain concepts using simple analogies.",
  maxSteps: 5,
  onStart: ({ input }) => console.log("Starting with:", input),
  onFinish: ({ result, duration }) => console.log(`Done in ${duration}ms`),
});
```

### Cancellation

Pass an `AbortController` signal via per-call overrides.

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 10_000);

const result = await helper.generate({
  prompt: "Explain quantum computing",
  signal: controller.signal,
});

if (!result.ok) {
  console.error(result.error.code); // 'AGENT_ERROR'
}
```

## Export as a plain function

Use `.fn()` for clean single-function exports. The returned function has the same signature as `.generate()`.

```ts
export const summarize = summarizer.fn();

// Callers use it like a regular async function
const result = await summarize({ text: "...", maxLength: 50 });
```

---

## Reference: `agent()` signature

```ts
function agent<TInput, TOutput, TTools, TSubAgents>(
  config: AgentConfig<TInput, TOutput, TTools, TSubAgents>,
): Agent<TInput, TOutput, TTools, TSubAgents>;
```

## Reference: AgentConfig

| Field          | Required | Type                                                            | Description                                                 |
| -------------- | -------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `name`         | Yes      | `string`                                                        | Unique agent name (used in logs, traces, hooks)             |
| `model`        | Yes      | `LanguageModel`                                                 | Model instance (e.g. `openai("gpt-4.1")`)                   |
| `input`        | No       | `ZodType<TInput>`                                               | Zod schema for typed input (requires `prompt`)              |
| `prompt`       | No       | `(params: { input: TInput }) => string \| Message[]`            | Render typed input into the model prompt (requires `input`) |
| `system`       | No       | `string \| ((params: { input: TInput }) => string)`             | System prompt (static or dynamic)                           |
| `tools`        | No       | `TTools` (Record of `Tool`)                                     | Tools for function calling                                  |
| `agents`       | No       | `TSubAgents` (Record of `Agent`)                                | Subagents, auto-wrapped as callable tools                   |
| `maxSteps`     | No       | `number`                                                        | Max tool-loop iterations (default: `20`)                    |
| `output`       | No       | `OutputParam`                                                   | Output type strategy                                        |
| `logger`       | No       | `Logger`                                                        | Pino-compatible logger                                      |
| `onStart`      | No       | `(event: { input }) => void \| Promise<void>`                   | Hook: fires when the agent starts                           |
| `onFinish`     | No       | `(event: { input, result, duration }) => void \| Promise<void>` | Hook: fires on success                                      |
| `onError`      | No       | `(event: { input, error }) => void \| Promise<void>`            | Hook: fires on error                                        |
| `onStepFinish` | No       | `(event: { stepId }) => void \| Promise<void>`                  | Hook: fires after each tool-loop step                       |

### Two modes

| Config                 | `.generate()` first param         | How prompt is built            |
| ---------------------- | --------------------------------- | ------------------------------ |
| `input` + `prompt` set | Typed `TInput`                    | `prompt({ input })` renders it |
| Both omitted           | `{ prompt: string } \| Message[]` | Passed directly to the model   |

## Reference: Agent interface

```ts
interface Agent<TInput, TOutput, TTools, TSubAgents> {
  generate(
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>,
  ): Promise<Result<GenerateResult<TOutput>>>;
  stream(
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>,
  ): Promise<Result<StreamResult<TOutput>>>;
  fn(): (
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>,
  ) => Promise<Result<GenerateResult<TOutput>>>;
}
```

## Reference: GenerateResult

```ts
interface GenerateResult<TOutput = string> {
  output: TOutput; // the generation output
  messages: Message[]; // full message history including tool calls
  usage: TokenUsage; // aggregated token usage across all tool-loop steps
  finishReason: string; // why the model stopped ('stop', 'length', 'tool-calls', etc.)
}
```

## Reference: StreamResult

```ts
interface StreamResult<TOutput = string> {
  output: Promise<TOutput>; // resolves after stream completes
  messages: Promise<Message[]>; // resolves after stream completes
  usage: Promise<TokenUsage>; // resolves after stream completes
  finishReason: Promise<string>; // resolves after stream completes
  fullStream: ReadableStream<string>; // live text deltas
}
```

## Reference: AgentOverrides

Per-call overrides passed as the optional second parameter to `.generate()` or `.stream()`. Override fields replace the base config for that call only.

| Field          | Type                                          | Description                     |
| -------------- | --------------------------------------------- | ------------------------------- |
| `model`        | `LanguageModel`                               | Override the model              |
| `system`       | `string \| ((params) => string)`              | Override the system prompt      |
| `tools`        | `Partial<TTools> & Record<string, Tool>`      | Merge with base tools           |
| `agents`       | `Partial<TSubAgents> & Record<string, Agent>` | Merge with base subagents       |
| `maxSteps`     | `number`                                      | Override max tool-loop steps    |
| `output`       | `OutputParam`                                 | Override the output strategy    |
| `signal`       | `AbortSignal`                                 | Abort signal for cancellation   |
| `logger`       | `Logger`                                      | Override the logger             |
| `onStart`      | hook                                          | Per-call hook, fires after base |
| `onFinish`     | hook                                          | Per-call hook, fires after base |
| `onError`      | hook                                          | Per-call hook, fires after base |
| `onStepFinish` | hook                                          | Per-call hook, fires after base |

---

## Troubleshooting

### Agent has `input` schema but no `prompt` function

Provide both `input` and `prompt`, or omit both for simple mode.

### Agent has `prompt` function but no `input` schema

Provide both `input` and `prompt`, or omit both for simple mode.

### Input validation failed

Check that the input matches the Zod schema. Ensure all required fields are present and types are correct.

---

## See also

- [Tools](tools.md)
- [Create a Flow Agent](create-flow-agent.md)
- [Cost Tracking](cost-tracking.md)
- [Custom Flow Engine](custom-flow-engine.md)
- [Hooks](hooks.md)
- [Troubleshooting](troubleshooting.md)
