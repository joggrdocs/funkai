# Create a Workflow

## Prerequisites

- `@pkg/agent-sdk` installed
- `OPENROUTER_API_KEY` environment variable set
- Familiarity with Zod schemas

## Steps

### 1. Define a basic workflow

A workflow has typed `input` and `output` Zod schemas and a handler function. The handler receives validated input and a `$` step builder for tracked operations.

```ts
import { workflow } from "@pkg/agent-sdk";
import { z } from "zod";

const myWorkflow = workflow(
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
      wordCount: page.value.split(/\s+/).length,
    };
  },
);
```

### 2. Use `$.step` for tracked operations

Every `$.step` call is registered in the execution trace. The `execute` callback receives a nested `$` for further composition.

```ts
const result = await $.step({
  id: "process-data",
  execute: async ({ $ }) => {
    // Nest further tracked operations
    const sub = await $.step({
      id: "sub-task",
      execute: async () => computeResult(),
    });
    return sub.ok ? sub.value : fallback;
  },
});
```

All `$` methods return `StepResult<T>`. Check `.ok` and access `.value` on success.

```ts
if (result.ok) {
  console.log(result.value); // the step's return value
  console.log(result.duration); // wall-clock time in ms
} else {
  console.error(result.error.message);
  console.error(result.error.stepId);
}
```

### 3. Use `$.agent` for agent calls

Run an agent as a tracked workflow step. The framework records the agent name, input, and output in the trace.

```ts
import { agent } from "@pkg/agent-sdk";

const analyzer = agent({
  name: "analyzer",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Analyze this text:\n\n${input.text}`,
});

const wf = workflow(
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

    return { analysis: result.value.output };
  },
);
```

### 4. Use `$.map` for parallel processing

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
  console.log(pages.value); // array of results in input order
}
```

### 5. Use `$.all` for heterogeneous concurrent operations

`$.all` runs multiple independent operations concurrently, like `Promise.all`. Entries are **factory functions** that receive an `AbortSignal` and return a promise.

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
  const [metadata, content, computed] = results.value;
}
```

Entries must be factory functions, not pre-started promises. This ensures the framework controls when work starts and can cancel entries via the signal.

### 6. Use `$.race` for first-to-finish

`$.race` runs multiple operations concurrently and returns the first to resolve. Losers are cancelled via abort signal. Entries follow the same factory function pattern as `$.all`.

```ts
const fastest = await $.race({
  id: "fastest-source",
  entries: [(signal) => fetchFromCDN(signal), (signal) => fetchFromOrigin(signal)],
});

if (fastest.ok) {
  console.log(fastest.value); // result from whichever finished first
}
```

### 7. Use other step types

| Method     | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `$.each`   | Sequential side effects. Returns `void`.                            |
| `$.reduce` | Sequential accumulation. Each step depends on the previous result.  |
| `$.while`  | Conditional loop. Runs while a condition holds. Returns last value. |

```ts
// $.each - sequential side effects
await $.each({
  id: "notify-users",
  input: users,
  execute: async ({ item: user }) => {
    await sendNotification(user.email, message);
  },
});

// $.reduce - sequential accumulation
const total = await $.reduce({
  id: "aggregate-scores",
  input: items,
  initial: 0,
  execute: async ({ item, accumulator }) => {
    return accumulator + item.score;
  },
});

// $.while - conditional loop
const converged = await $.while({
  id: "iterate-until-stable",
  condition: ({ value, index }) => index < 10 && (value === undefined || value.delta > 0.01),
  execute: async ({ index }) => {
    return await computeIteration(index);
  },
});
```

### 8. Stream step progress events

Use `.stream()` to receive `StepEvent` objects as the workflow executes.

```ts
const result = await myWorkflow.stream({ url: "https://example.com" });

if (result.ok) {
  const reader = result.stream.getReader();
  while (true) {
    const { done, value: event } = await reader.read();
    if (done) break;

    switch (event.type) {
      case "step:start":
        console.log(`Step started: ${event.step.id}`);
        break;
      case "step:finish":
        console.log(`Step finished: ${event.step.id} (${event.duration}ms)`);
        break;
      case "step:error":
        console.error(`Step failed: ${event.step.id}`, event.error);
        break;
      case "workflow:finish":
        console.log(`Workflow complete (${event.duration}ms)`);
        break;
    }
  }

  // Final output, trace, and duration are on the result
  console.log(result.output);
  console.log(result.trace);
}
```

### 9. Export as a plain function

Use `.fn()` for clean single-function exports.

```ts
export const processData = myWorkflow.fn();

// Callers use it like a regular async function
const result = await processData({ url: "https://example.com" });
```

### 10. Add hooks for observability

```ts
const wf = workflow(
  {
    name: "observed-workflow",
    input: InputSchema,
    output: OutputSchema,
    onStart: ({ input }) => console.log("Workflow started"),
    onFinish: ({ input, output, duration }) => console.log(`Done in ${duration}ms`),
    onError: ({ input, error }) => console.error("Failed:", error.message),
    onStepStart: ({ step }) => console.log(`Step ${step.id} started`),
    onStepFinish: ({ step, result, duration }) =>
      console.log(`Step ${step.id} done in ${duration}ms`),
  },
  handler,
);
```

## Full example

```ts
import { agent, workflow, tool } from "@pkg/agent-sdk";
import { z } from "zod";

// Define tools
const fetchPage = tool({
  description: "Fetch a web page",
  inputSchema: z.object({ url: z.url() }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { url, body: await res.text() };
  },
});

// Define agents
const summarizer = agent({
  name: "summarizer",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize:\n\n${input.text}`,
});

// Define workflow
const pipeline = workflow(
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
      input: pages.value,
      concurrency: 3,
      execute: async ({ item: page, $ }) => {
        const result = await $.agent({
          id: `summarize-${page.url}`,
          agent: summarizer,
          input: { text: page.body },
        });
        if (!result.ok) throw new Error(`Failed to summarize ${page.url}`);
        return { url: page.url, summary: result.value.output };
      },
    });

    if (!summaries.ok) throw new Error("Failed to summarize");

    return { summaries: summaries.value };
  },
);

export const summarizePages = pipeline.fn();
```

## Verification

- `result.ok` is `true` on success
- `result.output` contains the validated workflow output
- `result.trace` contains the frozen execution trace
- `result.usage` contains aggregated token usage from all `$.agent()` calls
- `result.duration` contains total wall-clock time in milliseconds

## Troubleshooting

### Input validation failed

**Fix:** Check that the input matches the `input` Zod schema. Ensure all required fields are present and types are correct.

### Output validation failed

**Fix:** Ensure the handler returns an object matching the `output` Zod schema.

### Step result not checked

**Fix:** All `$` methods return `StepResult` -- check `.ok` before accessing `.value`.

### `$.all`/`$.race` type error

**Fix:** Entries must be factory functions `(signal) => Promise`, not pre-started promises.

## References

- [Create an Agent](create-agent.md)
- [Create a Tool](create-tool.md)
- [Provider Overview](../provider/overview.md)
- [Troubleshooting](../troubleshooting.md)
