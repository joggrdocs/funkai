# Test Agents and Workflows

Patterns for unit testing agents, workflows, and tools with mocked models and deterministic assertions.

## Prerequisites

- `@funkai/agents` installed
- Vitest configured (`pnpm test --filter=@funkai/agents`)
- Familiarity with `agent()`, `workflow()`, and `tool()` APIs

## Steps

### 1. Use per-call model overrides for integration smoke tests

Agents accept a `model` override on each `.generate()` call. This is useful for low-cost integration smoke tests. For deterministic unit tests, use a fixed mock model/test double.

```ts
import { agent } from "@funkai/agents";
import { z } from "zod";
import { describe, it, expect } from "vitest";
import { simulateReadableStream } from "ai";

const summarizer = agent({
  name: "summarizer",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize:\n\n${input.text}`,
});

describe("summarizer", () => {
  it("returns a summary", async () => {
    // Create a mock model that returns a fixed response
    const mockModel = {
      doGenerate: async () => ({
        text: "This is a fixed test summary",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 5 },
      }),
    };

    const result = await summarizer.generate(
      { text: "Long article content..." },
      { model: mockModel as any },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe("This is a fixed test summary");
    }
  });
});
```

### 2. Assert on Result shape

Every agent and workflow returns `Result<T>`. Test both success and error paths by checking `result.ok`.

```ts
import { agent } from "@funkai/agents";
import { describe, it, expect } from "vitest";

const helper = agent({
  name: "helper",
  model: "openai/gpt-4.1",
  system: "You are a helpful assistant.",
});

describe("helper", () => {
  it("succeeds with a string output", async () => {
    const result = await helper.generate("What is TypeScript?");

    if (result.ok) {
      expect(result.output).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.usage.totalTokens).toBeGreaterThanOrEqual(0);
    }
  });

  it("fails gracefully on abort", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await helper.generate("This will be cancelled", {
      signal: controller.signal,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBeDefined();
    }
  });
});
```

### 3. Test typed agents with structured output

When an agent has an `output` schema, assert on the typed shape of `result.output`.

```ts
import { agent } from "@funkai/agents";
import { z } from "zod";
import { describe, it, expect } from "vitest";

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

describe("classifier", () => {
  it("returns structured output matching the schema", async () => {
    const result = await classifier.generate({
      title: "App crashes on login",
      body: "When I click the login button, the app crashes.",
    });

    if (result.ok) {
      expect(["bug", "feature", "question"]).toContain(result.output.category);
      expect(result.output.confidence).toBeGreaterThanOrEqual(0);
      expect(result.output.confidence).toBeLessThanOrEqual(1);
    }
  });
});
```

### 4. Test tools in isolation

Tools are plain functions with input validation. Test them independently of any agent by calling `execute` directly.

```ts
import { tool } from "@funkai/agents";
import { z } from "zod";
import { describe, it, expect } from "vitest";

const add = async ({ a, b }: { a: number; b: number }) => ({ result: a + b });

const calculator = tool({
  description: "Add two numbers",
  inputSchema: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: add,
});

describe("calculator tool", () => {
  it("adds two numbers", async () => {
    const result = await add({ a: 2, b: 3 });
    expect(result).toEqual({ result: 5 });
  });
});
```

### 5. Test workflow steps

Workflows have typed input/output schemas. Test the full pipeline or individual steps by checking `result.ok`, `result.output`, and `result.trace`.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";
import { describe, it, expect } from "vitest";

const pipeline = workflow(
  {
    name: "text-stats",
    input: z.object({ text: z.string() }),
    output: z.object({ wordCount: z.number(), charCount: z.number() }),
  },
  async ({ input, $ }) => {
    const stats = await $.step({
      id: "compute-stats",
      execute: async () => ({
        wordCount: input.text.split(/\s+/).filter(Boolean).length,
        charCount: input.text.length,
      }),
    });

    if (!stats.ok) throw new Error(stats.error.message);

    return stats.value;
  },
);

describe("text-stats workflow", () => {
  it("computes word and character counts", async () => {
    const result = await pipeline.generate({ text: "hello world" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toEqual({ wordCount: 2, charCount: 11 });
      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it("rejects invalid input", async () => {
    // @ts-expect-error intentionally passing wrong type
    const result = await pipeline.generate({ text: 42 });
    expect(result.ok).toBe(false);
  });
});
```

### 6. Test error paths

Verify that failing steps produce `ok: false` with meaningful error codes.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";
import { describe, it, expect } from "vitest";

const failingWorkflow = workflow(
  {
    name: "failing",
    input: z.object({ shouldFail: z.boolean() }),
    output: z.object({ status: z.string() }),
  },
  async ({ input, $ }) => {
    const result = await $.step({
      id: "maybe-fail",
      execute: async () => {
        if (input.shouldFail) throw new Error("Intentional failure");
        return "success";
      },
    });

    return { status: result.ok ? result.value : "failed" };
  },
);

describe("error paths", () => {
  it("handles step failure gracefully", async () => {
    const result = await failingWorkflow.generate({ shouldFail: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.status).toBe("failed");
    }
  });

  it("succeeds on happy path", async () => {
    const result = await failingWorkflow.generate({ shouldFail: false });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.status).toBe("success");
    }
  });
});
```

### 7. Assert on token usage

Verify that `result.usage` contains expected token counts after generation.

```ts
import { agent } from "@funkai/agents";
import { describe, it, expect } from "vitest";

const helper = agent({
  name: "helper",
  model: "openai/gpt-4.1",
  system: "Reply with one word.",
});

describe("usage tracking", () => {
  it("reports token usage on successful generation", async () => {
    const result = await helper.generate("Say hello");

    if (result.ok) {
      expect(result.usage.inputTokens).toBeGreaterThan(0);
      expect(result.usage.outputTokens).toBeGreaterThan(0);
      expect(result.usage.totalTokens).toBe(result.usage.inputTokens + result.usage.outputTokens);
    }
  });
});
```

### 8. Use hooks for test observability

Capture lifecycle events with hooks to verify execution order and timing.

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";
import { describe, it, expect } from "vitest";

describe("workflow hooks", () => {
  it("fires hooks in correct order", async () => {
    const events: string[] = [];

    const traced = workflow(
      {
        name: "traced",
        input: z.object({ value: z.string() }),
        output: z.object({ result: z.string() }),
        onStart: () => {
          events.push("workflow:start");
        },
        onStepStart: ({ step }) => {
          events.push(`step:start:${step.id}`);
        },
        onStepFinish: ({ step }) => {
          events.push(`step:finish:${step.id}`);
        },
        onFinish: () => {
          events.push("workflow:finish");
        },
      },
      async ({ input, $ }) => {
        await $.step({
          id: "process",
          execute: async () => input.value.toUpperCase(),
        });
        return { result: input.value.toUpperCase() };
      },
    );

    await traced.generate({ value: "test" });

    expect(events).toEqual([
      "workflow:start",
      "step:start:process",
      "step:finish:process",
      "workflow:finish",
    ]);
  });
});
```

## Verification

- All tests pass: `pnpm test --filter=@funkai/agents`
- `result.ok` is checked before accessing success fields
- Error paths return `ok: false` with `error.code` and `error.message`
- Hook events fire in the documented order

## Troubleshooting

### Tests hang indefinitely

**Issue:** Agent tests wait for a real model response that never arrives.

**Fix:** Use a fast model (e.g. `openai/gpt-4.1-nano`) or set a timeout on the test. Pass an `AbortSignal` with a deadline.

### Input validation errors in tests

**Issue:** Test input does not match the Zod schema.

**Fix:** Ensure test data satisfies all required fields and types in the agent's `input` schema.

### Hook assertions fail due to ordering

**Issue:** Hook events arrive in an unexpected order.

**Fix:** Hooks fire in a deterministic order: base hooks first, then per-call hooks. See [Hooks](../core/hooks.md) for the full execution order.

## References

- [Create an Agent](create-agent.md)
- [Create a Workflow](create-workflow.md)
- [Hooks](../core/hooks.md)
- [Core Overview](../core/overview.md)
- [Troubleshooting](../troubleshooting.md)
