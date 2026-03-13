# Handle Error Recovery

Patterns for building resilient agents and workflows that recover gracefully from failures.

## Prerequisites

- `@funkai/agents` installed
- Familiarity with `workflow()`, `$.step`, `$.while`, `$.map`, and hooks
- Understanding of `StepResult` and `Result` types

## Steps

### 1. Use fallback values on step failure

Every `$` method returns `StepResult<T>` with an `ok` field. Check it before accessing `.value` and provide a fallback when the step fails.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";

const resilient = workflow(
  {
    name: "resilient-fetch",
    input: z.object({ url: z.string() }),
    output: z.object({ body: z.string(), source: z.string() }),
  },
  async ({ input, $ }) => {
    const primary = await $.step({
      id: "fetch-primary",
      execute: async () => {
        const res = await fetch(input.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      },
    });

    if (primary.ok) {
      return { body: primary.value, source: "primary" };
    }

    // Fallback to a cached or default value
    const fallback = await $.step({
      id: "fetch-fallback",
      execute: async () => {
        const res = await fetch(`${input.url}?cached=true`);
        return await res.text();
      },
    });

    return {
      body: fallback.ok ? fallback.value : "Service unavailable",
      source: fallback.ok ? "fallback" : "default",
    };
  },
);
```

### 2. Retry with `$.while`

Use `$.while` for retry logic with a bounded iteration count. The condition receives the last value and iteration index.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";

const retryable = workflow(
  {
    name: "retry-fetch",
    input: z.object({ url: z.string(), maxRetries: z.number().default(3) }),
    output: z.object({ body: z.string(), attempts: z.number() }),
  },
  async ({ input, $ }) => {
    const result = await $.while({
      id: "retry-loop",
      condition: ({ value, index }) =>
        index < input.maxRetries && (value === undefined || !value.ok),
      execute: async ({ index }) => {
        // Exponential backoff: 0ms, 1000ms, 2000ms, ...
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * index));
        }
        try {
          const res = await fetch(input.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return { ok: true as const, body: await res.text(), attempt: index + 1 };
        } catch {
          return { ok: false as const, body: "", attempt: index + 1 };
        }
      },
    });

    const last = result.ok ? result.value : undefined;
    return {
      body: last?.ok ? last.body : "All retries failed",
      attempts: last?.attempt ?? 0,
    };
  },
);
```

### 3. Handle partial success with `$.map`

When processing multiple items, some may fail while others succeed. Check each item's result independently rather than failing the entire batch.

```ts
import { workflow, agent } from "@funkai/agents";
import { z } from "zod";

const summarizer = agent({
  name: "summarizer",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize briefly:\n\n${input.text}`,
});

const batchSummarizer = workflow(
  {
    name: "batch-summarize",
    input: z.object({ texts: z.array(z.string()) }),
    output: z.object({
      results: z.array(
        z.object({
          index: z.number(),
          summary: z.string(),
          ok: z.boolean(),
        }),
      ),
    }),
  },
  async ({ input, $ }) => {
    const summaries = await $.map({
      id: "summarize-all",
      input: input.texts,
      concurrency: 3,
      execute: async ({ item, index, $ }) => {
        const result = await $.agent({
          id: `summarize-${index}`,
          agent: summarizer,
          input: { text: item },
        });
        return {
          index,
          summary: result.ok ? result.value.output : "Failed to summarize",
          ok: result.ok,
        };
      },
    });

    // $.map itself can fail if an execute throws -- handle that too
    return {
      results: summaries.ok
        ? summaries.value
        : input.texts.map((_, index) => ({
            index,
            summary: "Batch processing failed",
            ok: false,
          })),
    };
  },
);
```

### 4. Build a circuit breaker with `$.reduce`

Track consecutive failures and stop processing when a threshold is reached.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";

interface CircuitState {
  readonly failures: number;
  readonly results: readonly string[];
  readonly tripped: boolean;
}

const circuitBreaker = workflow(
  {
    name: "circuit-breaker",
    input: z.object({ urls: z.array(z.string()), maxFailures: z.number().default(3) }),
    output: z.object({ results: z.array(z.string()), tripped: z.boolean() }),
  },
  async ({ input, $ }) => {
    const initial: CircuitState = { failures: 0, results: [], tripped: false };

    const state = await $.reduce({
      id: "process-with-circuit",
      input: input.urls,
      initial,
      execute: async ({ item: url, accumulator }) => {
        // Circuit tripped -- skip remaining items
        if (accumulator.tripped) {
          return {
            ...accumulator,
            results: [...accumulator.results, "skipped"],
          };
        }

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = await res.text();
          return {
            failures: 0, // reset on success
            results: [...accumulator.results, body],
            tripped: false,
          };
        } catch {
          const newFailures = accumulator.failures + 1;
          return {
            failures: newFailures,
            results: [...accumulator.results, "error"],
            tripped: newFailures >= input.maxFailures,
          };
        }
      },
    });

    return {
      results: state.ok ? [...state.value.results] : [],
      tripped: state.ok ? state.value.tripped : true,
    };
  },
);
```

### 5. Log errors with hooks

Use workflow and step hooks to capture errors for logging and observability without interrupting the execution flow.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";

const observed = workflow(
  {
    name: "observed-pipeline",
    input: z.object({ data: z.string() }),
    output: z.object({ result: z.string() }),
    onError: ({ input, error }) => {
      console.error(`Workflow failed for input: ${JSON.stringify(input)}`, error.message);
    },
    onStepFinish: ({ step, result, duration }) => {
      if (result === undefined) {
        // result is undefined on step error
        console.warn(`Step ${step.id} failed after ${duration}ms`);
      }
    },
  },
  async ({ input, $ }) => {
    const processed = await $.step({
      id: "process",
      onError: ({ id, error }) => {
        console.error(`Step ${id} error:`, error.message);
      },
      execute: async () => {
        return input.data.toUpperCase();
      },
    });

    return { result: processed.ok ? processed.value : "fallback" };
  },
);
```

### 6. Combine patterns for robust pipelines

Chain fallback, retry, and logging into a single workflow.

```ts
import { workflow, agent } from "@funkai/agents";
import { z } from "zod";

const analyzer = agent({
  name: "analyzer",
  model: "openai/gpt-4.1",
  input: z.object({ content: z.string() }),
  prompt: ({ input }) => `Analyze this content:\n\n${input.content}`,
});

const robust = workflow(
  {
    name: "robust-analysis",
    input: z.object({ url: z.string() }),
    output: z.object({ analysis: z.string(), source: z.string() }),
    onStepFinish: ({ step, result, duration }) => {
      const status = result !== undefined ? "ok" : "error";
      console.log(`[${step.id}] ${status} (${duration}ms)`);
    },
  },
  async ({ input, $ }) => {
    // Step 1: Fetch with retry
    const content = await $.while({
      id: "fetch-retry",
      condition: ({ value, index }) => index < 3 && (value === undefined || !value.ok),
      execute: async ({ index }) => {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * index));
        }
        try {
          const res = await fetch(input.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return { ok: true as const, body: await res.text() };
        } catch {
          return { ok: false as const, body: "" };
        }
      },
    });

    const fetchedBody = content.ok && content.value?.ok ? content.value.body : undefined;

    if (!fetchedBody) {
      return { analysis: "Unable to fetch content", source: "none" };
    }

    // Step 2: Analyze with fallback
    const result = await $.agent({
      id: "analyze",
      agent: analyzer,
      input: { content: fetchedBody },
    });

    return {
      analysis: result.ok ? result.value.output : "Analysis unavailable",
      source: result.ok ? "agent" : "fallback",
    };
  },
);
```

## Verification

- Failing steps return `StepResult` with `ok: false` instead of throwing
- Retry loops terminate within the configured bounds
- Partial success workflows return results for both succeeded and failed items
- Hook errors are swallowed and never mask the original error
- Circuit breaker skips remaining items after the failure threshold

## Troubleshooting

### Retry loop runs forever

**Issue:** The `$.while` condition never becomes false.

**Fix:** Always include an `index < maxRetries` guard in the condition. The condition is checked before each iteration.

### Hook errors masking step errors

**Issue:** Expected error information is missing.

**Fix:** Hook errors are swallowed by design (via `attemptEachAsync`). The original step error is always preserved in the `StepResult`. Handle errors inside hooks if you need them to surface.

### `$.map` fails on first error

**Issue:** One item failure causes the entire `$.map` to fail.

**Fix:** Catch errors inside the `execute` callback and return an error marker value instead of throwing. This allows other items to continue processing.

### Fallback step also fails

**Issue:** Both primary and fallback steps fail, leaving no result.

**Fix:** Always include a final default value that does not depend on external calls. Use a static string or empty object as the last resort.

## References

- [Step Builder ($)](../core/step.md)
- [Hooks](../core/hooks.md)
- [Create a Workflow](create-workflow.md)
- [Core Overview](../core/overview.md)
- [Troubleshooting](../troubleshooting.md)
