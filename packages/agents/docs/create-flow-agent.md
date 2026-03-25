# Create a Flow Agent

`flowAgent()` creates a `FlowAgent` from a configuration object and an imperative handler function. The handler IS the flow agent — no step arrays, no definition objects. State is just variables. `$` is passed in for tracked operations.

## Basic flow agent

A flow agent has a typed `input` Zod schema and an optional `output` Zod schema, plus a handler function. The handler receives validated input and a `$` step builder for tracked operations.

```ts
import { flowAgent } from "@funkai/agents";
import { z } from "zod";

const myFlowAgent = flowAgent(
  {
    name: "data-processor",
    input: z.object({ url: z.url() }),
    output: z.object({ title: z.string(), wordCount: z.number() }),
  },
  async ({ input, $ }) => {
    const page = await $.step({
      id: "fetch-page",
      execute: async () => {
        const res = await fetch(input.url);
        return await res.text();
      },
    });

    if (!page.ok) throw new Error(page.error.message);

    return {
      title: input.url,
      wordCount: page.output.split(/\s+/).length,
    };
  },
);

const result = await myFlowAgent.generate({ input: { url: "https://example.com" } });
if (result.ok) {
  console.log(result.output); // validated output
  console.log(result.trace); // frozen execution trace tree
  console.log(result.usage); // aggregated token usage from all $.agent() calls
  console.log(result.duration); // wall-clock time in ms
}
```

## `$` operations

Every `$` method is registered in the execution trace and returns a `FlowStepResult<T>`. Always check `.ok` before accessing `.output`.

```ts
if (result.ok) {
  console.log(result.output); // the step's return value
  console.log(result.duration); // wall-clock time in ms
} else {
  console.error(result.error.message);
  console.error(result.error.stepId);
}
```

### `$.step` — single unit of work

The fundamental tracked operation. The `execute` callback receives a nested `$` for further composition.

```ts
const result = await $.step({
  id: "process-data",
  execute: async ({ $ }) => {
    const sub = await $.step({
      id: "sub-task",
      execute: async () => computeResult(),
    });
    return sub.ok ? sub.output : fallback;
  },
});
```

### `$.agent` — tracked agent call

Run an `agent()` as a tracked step. The framework records the agent name, input, output, and token usage in the trace.

```ts
import { agent, flowAgent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const analyzer = agent({
  name: "analyzer",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Analyze this text:\n\n${input.text}`,
});

const pipeline = flowAgent(
  {
    name: "analysis-pipeline",
    input: z.object({ content: z.string() }),
    output: z.object({ analysis: z.string() }),
  },
  async ({ input, $ }) => {
    const result = await $.agent({
      id: "analyze-content",
      agent: analyzer,
      input: { text: input.content },
    });

    if (!result.ok) throw new Error(result.error.message);

    return { analysis: result.output };
  },
);
```

### `$.map` — parallel processing

Process an array of items concurrently. Results are returned in input order. Use `concurrency` to limit parallelism.

```ts
const pages = await $.map({
  id: "fetch-pages",
  input: urls,
  concurrency: 3,
  execute: async ({ item: url, index, $ }) => {
    const res = await fetch(url);
    return { url, status: res.status, body: await res.text() };
  },
});

if (pages.ok) {
  console.log(pages.output); // array of results in input order
}
```

### `$.all` — heterogeneous concurrent operations

Runs multiple independent operations concurrently, like `Promise.all`. Entries are **factory functions** that receive an `AbortSignal` and return a promise — not pre-started promises.

```ts
const results = await $.all({
  id: "parallel-tasks",
  entries: [
    (signal) => fetchMetadata(signal),
    (signal) => fetchContent(signal),
    (signal) =>
      $.step({
        id: "compute",
        execute: async () => heavyComputation(),
      }),
  ],
});

if (results.ok) {
  const [metadata, content, computed] = results.output;
}
```

### `$.race` — first-to-finish

Runs multiple operations concurrently and returns the first to resolve. Losers are cancelled via abort signal. Entries follow the same factory function pattern as `$.all`.

```ts
const fastest = await $.race({
  id: "fastest-source",
  entries: [(signal) => fetchFromCDN(signal), (signal) => fetchFromOrigin(signal)],
});

if (fastest.ok) {
  console.log(fastest.output); // result from whichever finished first
}
```

### Additional step types

| Method     | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `$.each`   | Sequential side effects. Returns `void`.                            |
| `$.reduce` | Sequential accumulation. Each step depends on the previous result.  |
| `$.while`  | Conditional loop. Runs while a condition holds. Returns last value. |

```ts
// $.each — sequential side effects
await $.each({
  id: "notify-users",
  input: users,
  execute: async ({ item: user }) => {
    await sendNotification(user.email, message);
  },
});

// $.reduce — sequential accumulation
const total = await $.reduce({
  id: "aggregate-scores",
  input: items,
  initial: 0,
  execute: async ({ item, accumulator }) => {
    return accumulator + item.score;
  },
});

// $.while — conditional loop
const converged = await $.while({
  id: "iterate-until-stable",
  condition: ({ value, index }) => index < 10 && (value === undefined || value.delta > 0.01),
  execute: async ({ index }) => {
    return await computeIteration(index);
  },
});
```

## Trace

Every `$` operation produces a `TraceEntry`. Nested operations appear as `children`, forming a tree that represents the full execution graph. After execution completes, the trace is deep-cloned and frozen via `snapshotTrace()`.

```ts
const result = await myFlowAgent.generate({ input });

if (result.ok) {
  for (const entry of result.trace) {
    const duration = (entry.finishedAt ?? 0) - entry.startedAt;
    console.log(entry.id, entry.type, duration);
  }
}
```

Walk the trace recursively to inspect nested operations:

```ts
function walkTrace(entries: readonly TraceEntry[], depth = 0): void {
  for (const entry of entries) {
    const indent = "  ".repeat(depth);
    const duration = (entry.finishedAt ?? 0) - entry.startedAt;
    console.log(`${indent}${entry.type}(${entry.id}) ${duration}ms`);
    if (entry.children) {
      walkTrace(entry.children, depth + 1);
    }
  }
}

if (result.ok) {
  walkTrace(result.trace);
}
```

Use `collectUsages()` to recursively extract all `TokenUsage` values from the trace tree:

```ts
import { collectUsages } from "@funkai/agents";

if (result.ok) {
  const usages = collectUsages(result.trace);
  const totalTokens = usages.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0);
  console.log("Total tokens:", totalTokens);
}
```

See [Cost Tracking](cost-tracking.md) for full usage aggregation and cost calculation.

## Typed I/O

The `input` Zod schema is required on a flow agent. The `output` schema is optional — when provided, the handler must return a value that satisfies it (validation runs before the result is returned to the caller). When omitted, the handler returns `void` and the collected text from sub-agent responses becomes a `string` output.

```ts
import { flowAgent } from "@funkai/agents";
import { z } from "zod";

const InputSchema = z.object({
  urls: z.array(z.url()),
});

const OutputSchema = z.object({
  summaries: z.array(z.object({ url: z.string(), summary: z.string() })),
});

const pipeline = flowAgent(
  {
    name: "summarize-pages",
    input: InputSchema,
    output: OutputSchema,
  },
  async ({ input, $ }) => {
    // handler must return OutputSchema-compatible value
    return { summaries: [] };
  },
);
```

## Streaming step progress

Use `.stream()` to receive `StepEvent` objects as the flow agent executes.

```ts
const result = await myFlowAgent.stream({ input: { url: "https://example.com" } });

if (result.ok) {
  for await (const event of result.fullStream) {
    switch (event.type) {
      case "step:start":
        console.log(`Step started: ${event.stepId}`);
        break;
      case "step:finish":
        console.log(`Step finished: ${event.stepId} (${event.duration}ms)`);
        break;
      case "step:error":
        console.error(`Step failed: ${event.stepId}`, event.error);
        break;
      case "flow:finish":
        console.log(`Flow agent complete (${event.duration}ms)`);
        break;
    }
  }

  // Final output resolves after stream completes
  const output = await result.output;
}
```

## Hooks for observability

```ts
const wf = flowAgent(
  {
    name: "observed-flow-agent",
    input: InputSchema,
    output: OutputSchema,
    onStart: ({ input }) => console.log("Flow agent started"),
    onFinish: ({ input, result, duration }) => console.log(`Done in ${duration}ms`),
    onError: ({ input, error }) => console.error("Failed:", error.message),
    onStepStart: ({ stepId, stepOperation }) => console.log(`Step ${stepId} started`),
    onStepFinish: ({ stepId, stepOperation, output, duration }) =>
      console.log(`Step ${stepId} done in ${duration}ms`),
  },
  handler,
);
```

## Export as a plain function

Use `.fn()` for clean single-function exports.

```ts
export const processData = myFlowAgent.fn();

// Callers use it like a regular async function
const result = await processData({ input: { url: "https://example.com" } });
```

## Full example

```ts
import { agent, flowAgent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const summarizer = agent({
  name: "summarizer",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize:\n\n${input.text}`,
});

const pipeline = flowAgent(
  {
    name: "summarize-pages",
    input: z.object({ urls: z.array(z.url()) }),
    output: z.object({
      summaries: z.array(z.object({ url: z.string(), summary: z.string() })),
    }),
  },
  async ({ input, $ }) => {
    // Fetch all pages in parallel
    const pages = await $.map({
      id: "fetch-pages",
      input: input.urls,
      concurrency: 5,
      execute: async ({ item: url }) => {
        const res = await fetch(url);
        return { url, body: await res.text() };
      },
    });

    if (!pages.ok) throw new Error("Failed to fetch pages");

    // Summarize each page with the agent
    const summaries = await $.map({
      id: "summarize-pages",
      input: pages.output,
      concurrency: 3,
      execute: async ({ item: page, $ }) => {
        const result = await $.agent({
          id: `summarize-${page.url}`,
          agent: summarizer,
          input: { text: page.body },
        });
        if (!result.ok) throw new Error(`Failed to summarize ${page.url}`);
        return { url: page.url, summary: result.output };
      },
    });

    if (!summaries.ok) throw new Error("Failed to summarize");

    return { summaries: summaries.output };
  },
);

export const summarizePages = pipeline.fn();
```

---

## Reference: `flowAgent()` signature

```ts
// With structured output
function flowAgent<TInput, TOutput>(
  config: FlowAgentConfigWithOutput<TInput, TOutput>,
  handler: FlowAgentHandler<TInput, TOutput>,
): FlowAgent<TInput, TOutput>;

// Without output schema (void handler, string output)
function flowAgent<TInput>(
  config: FlowAgentConfigWithoutOutput<TInput>,
  handler: FlowAgentHandler<TInput, void>,
): FlowAgent<TInput, string>;
```

## Reference: FlowAgentConfig

| Field          | Required | Type                                                            | Description                                               |
| -------------- | -------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `name`         | Yes      | `string`                                                        | Unique flow agent name (used in logs, traces)             |
| `input`        | Yes      | `ZodType<TInput>`                                               | Zod schema for validating input                           |
| `output`       | No       | `ZodType<TOutput>`                                              | Zod schema for validating output (omit for string output) |
| `agents`       | No       | `FlowSubAgents`                                                 | Record of agents available to `$.agent()`                 |
| `logger`       | No       | `Resolver<TInput, Logger>`                                      | Pino-compatible logger                                    |
| `onStart`      | No       | `(event: { input }) => void \| Promise<void>`                   | Hook: fires when the flow agent starts                    |
| `onFinish`     | No       | `(event: { input, result, duration }) => void \| Promise<void>` | Hook: fires on success                                    |
| `onError`      | No       | `(event: { input, error }) => void \| Promise<void>`            | Hook: fires on error                                      |
| `onStepStart`  | No       | `(event: StepStartEvent) => void \| Promise<void>`              | Hook: fires when any `$` step starts                      |
| `onStepFinish` | No       | `(event: StepFinishEvent) => void \| Promise<void>`             | Hook: fires when any `$` step finishes                    |

## Reference: FlowAgentGenerateResult

```ts
interface FlowAgentGenerateResult<TOutput> {
  output: TOutput; // validated output
  messages: Message[]; // full message history
  finishReason: string; // why the model stopped
  trace: readonly TraceEntry[]; // frozen execution trace tree
  usage: TokenUsage; // aggregated token usage from all $.agent() calls
  duration: number; // wall-clock time in ms
}
```

## Reference: TraceEntry

```ts
interface TraceEntry {
  id: string;
  type: OperationType;
  input?: unknown;
  output?: unknown;
  startedAt: number;
  finishedAt?: number;
  error?: Error;
  usage?: TokenUsage;
  children?: readonly TraceEntry[];
}
```

| Field        | Type            | Description                                                 |
| ------------ | --------------- | ----------------------------------------------------------- |
| `id`         | `string`        | Unique id from the `$` config that produced this entry      |
| `type`       | `OperationType` | What kind of operation produced this entry                  |
| `input`      | `unknown`       | Input snapshot captured when the operation starts           |
| `output`     | `unknown`       | Output snapshot captured on success                         |
| `startedAt`  | `number`        | Start time in Unix milliseconds                             |
| `finishedAt` | `number`        | End time in Unix milliseconds (`undefined` while running)   |
| `error`      | `Error`         | Error instance if the operation failed                      |
| `usage`      | `TokenUsage`    | Token usage (populated for successful `agent` type entries) |
| `children`   | `TraceEntry[]`  | Nested trace entries for child operations                   |

### OperationType values

| Value      | Source       | Description                         |
| ---------- | ------------ | ----------------------------------- |
| `"step"`   | `$.step()`   | Single unit of work                 |
| `"agent"`  | `$.agent()`  | Agent generation call               |
| `"map"`    | `$.map()`    | Parallel map operation              |
| `"each"`   | `$.each()`   | Sequential side effects             |
| `"reduce"` | `$.reduce()` | Sequential accumulation             |
| `"while"`  | `$.while()`  | Conditional loop                    |
| `"all"`    | `$.all()`    | Concurrent heterogeneous operations |
| `"race"`   | `$.race()`   | First-to-finish race                |

## Reference: StepEvent (stream)

Events emitted on the flow agent stream:

| Type          | Fields                       | Description               |
| ------------- | ---------------------------- | ------------------------- |
| `step:start`  | `stepId`, `stepOperation`, `agentChain?` | A `$` operation started   |
| `step:finish` | `stepId`, `stepOperation`, `output`, `duration` | A `$` operation completed |
| `step:error`  | `stepId`, `stepOperation`, `error`       | A `$` operation failed    |
| `flow:finish` | `output`, `duration`         | The flow agent completed  |

## Reference: FlowAgentOverrides

| Field    | Type          | Description                   |
| -------- | ------------- | ----------------------------- |
| `signal` | `AbortSignal` | Abort signal for cancellation |

When the signal fires, all in-flight `$` operations check `signal.aborted` and abort. The signal propagates through the entire execution tree.

---

## Troubleshooting

### Input validation failed

Check that the input matches the `input` Zod schema. Ensure all required fields are present and types are correct.

### Output validation failed

Ensure the handler returns an object matching the `output` Zod schema.

### Step result not checked

All `$` methods return `FlowStepResult` -- check `.ok` before accessing `.output`.

### `$.all`/`$.race` type error

Entries must be factory functions `(signal) => Promise`, not pre-started promises.

---

## See also

- [Create an Agent](create-agent.md)
- [Tools](tools.md)
- [Custom Flow Engine](custom-flow-engine.md)
- [Cost Tracking](cost-tracking.md)
- [Hooks](hooks.md)
- [Troubleshooting](troubleshooting.md)
