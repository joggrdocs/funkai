# Flow Agents

`flowAgent()` creates a multi-step agent whose logic is plain imperative TypeScript. There are no step arrays or definition objects — you write a handler function and use `$` for tracked operations.

Flow agents always require a typed `input` Zod schema, validated on entry. The `output` schema is optional — when provided, the handler's return value is validated against it before being returned to the caller. When omitted, the handler returns `void` and the collected text from sub-agent responses becomes a `string` output.

## Basic example

```typescript
import { agent, flowAgent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Write a short paragraph about: ${input.topic}`,
});

const pipeline = flowAgent(
  {
    name: "write-and-review",
    input: z.object({ topic: z.string() }),
    output: z.object({ text: z.string() }),
  },
  async ({ input, $ }) => {
    // $.step — tracked unit of synchronous or async work
    const slug = await $.step({
      id: "slugify",
      execute: async () => input.topic.toLowerCase().replace(/\s+/g, "-"),
    });

    // $.agent — tracked agent call, returns FlowAgentStepResult
    const draft = await $.agent({
      id: "write-draft",
      agent: writer,
      input: { topic: input.topic },
    });

    if (!draft.ok) {
      return { text: "Generation failed." };
    }

    return { text: draft.output };
  },
);

const result = await pipeline.generate({ input: { topic: "pattern matching" } });

if (result.ok) {
  console.log(result.output.text);
  console.log("Duration:", result.duration, "ms");
  console.log("Trace:", result.trace); // full execution tree
}
```

## The $ step builder

`$` provides operations that are tracked in the execution trace. All return `Promise<FlowStepResult<T>>` — check `.ok` before using `.output`.

| Operation  | Description                                            |
| ---------- | ------------------------------------------------------ |
| `$.step`   | Single unit of work                                    |
| `$.agent`  | Call an `agent()` as a tracked step                    |
| `$.map`    | Map over an array with optional concurrency            |
| `$.each`   | Iterate an array sequentially                          |
| `$.reduce` | Reduce an array to a single value                      |
| `$.while`  | Loop while a condition holds                           |
| `$.all`    | Run multiple operations in parallel (all must succeed) |
| `$.race`   | Run multiple operations in parallel (first one wins)   |

State lives in plain variables — use closures. There is no shared state object.

## Trace and usage

`result.trace` is a readonly tree of every `$` operation: its id, type, duration, and nested children. `result.usage` aggregates token counts from all `$.agent` calls in the flow.

## Streaming step progress

`.stream()` emits `StepEvent` objects (`step:start`, `step:finish`, `step:error`, `flow:finish`) as each `$` operation runs. Use this to push real-time progress to a UI.

```typescript
const result = await pipeline.stream({ input: { topic: "closures" } });

if (result.ok) {
  for await (const event of result.fullStream) {
    if (event.type === "step:finish") {
      console.log(event.stepId, "done in", event.duration, "ms");
    }
  }
}
```

## References

- [`flowAgent()` reference](/reference/agents/flow-agent)
- [Multi-Agent Orchestration guide](/guides/multi-agent)
- [Agents](/concepts/agents)
