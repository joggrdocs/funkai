# Agents

`agent()` creates a single LLM boundary — one model, an optional tool loop, typed I/O, and `Result`-based returns. It wraps the AI SDK's `generateText`/`streamText` without hiding them.

Every call to `.generate()` or `.stream()` returns `Result<T>`. Check `.ok` before accessing values — there is no try/catch.

## Two modes

**Simple** — no input schema. Pass a prompt object at call time.

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
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.output); // string
```

**Typed** — declare `input` (Zod schema) and `prompt` (render function) together. Call time is fully type-checked.

```typescript
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const summarizer = agent({
  name: "summarizer",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string(), maxWords: z.number() }),
  prompt: ({ input }) => `Summarize the following in ${input.maxWords} words:\n\n${input.text}`,
});

const result = await summarizer.generate({ text: "Long article...", maxWords: 50 });

if (result.ok) {
  console.log(result.output);
}
```

`input` and `prompt` must be provided together — one without the other is a type error.

## Streaming

Use `.stream()` instead of `.generate()`. Consume `result.fullStream` for incremental output; `result.output` resolves after the stream ends.

```typescript
const result = await assistant.stream({ prompt: "Tell me a story." });

if (result.ok) {
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      process.stdout.write(part.textDelta);
    }
  }
  const final = await result.output;
}
```

## Tools and subagents

Pass a `tools` record for function calling. Pass an `agents` record to expose other agents as callable tools — abort signals propagate automatically.

```typescript
const analyst = agent({
  name: "analyst",
  model: openai("gpt-4.1"),
  system: "You analyze data. Delegate searches to the searcher.",
  tools: { calculator },
  agents: { searcher: searchAgent },
});
```

## Output strategies

The `output` field controls the return type of `result.output`:

| Strategy                     | Result type | Description                                              |
| ---------------------------- | ----------- | -------------------------------------------------------- |
| `Output.text()`              | `string`    | Plain text (default)                                     |
| `Output.object({ schema })`  | `T`         | Validated structured object matching the Zod schema      |
| `Output.array({ element })`  | `T[]`       | Validated array of objects matching the element schema   |
| `Output.choice({ options })` | `string`    | One of the provided string options (enum/classification) |
| `z.object({ ... })`          | `T`         | Shorthand — auto-wrapped as `Output.object()`            |
| `z.array(z.object({ ... }))` | `T[]`       | Shorthand — auto-wrapped as `Output.array()`             |

```typescript
import { agent, Output } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const classifier = agent({
  name: "classifier",
  model: openai("gpt-4.1"),
  output: Output.object({
    schema: z.object({
      category: z.enum(["bug", "feature", "question"]),
      confidence: z.number(),
    }),
  }),
});

const result = await classifier.generate({ prompt: "App crashes on login" });
if (result.ok) {
  console.log(result.output.category); // "bug"
  console.log(result.output.confidence); // 0.95
}
```

## Hooks

`onStart`, `onFinish`, `onError`, and `onStepFinish` fire at lifecycle points. Set them on the config or pass them per-call as overrides.

## When to use `agent()` vs `flowAgent()`

Use `agent()` when a single model call (with optional tool iterations) is sufficient — question answering, classification, summarization, or single-turn tool use. Use `flowAgent()` when you need to coordinate multiple agents, run parallel work, or implement custom control flow with traced steps. See [Flow Agents](/concepts/flow-agents) for details.

## References

- [`agent()` reference](/reference/agents/agent)
- [Streaming guide](/guides/streaming)
- [Tools](/concepts/tools)
- [Flow Agents](/concepts/flow-agents)
