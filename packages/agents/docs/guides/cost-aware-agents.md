# Build Cost-Aware Agents

Track token usage, calculate costs, enforce budgets, and optimize model selection for cost-efficient workflows.

## Prerequisites

- `@pkg/agent-sdk` installed
- `@funkai/models` installed (provides `calculateCost`, `model`, `models`)
- Familiarity with `agent()`, `workflow()`, and hooks

## Steps

### 1. Track usage per agent call

Every successful `agent.generate()` returns `result.usage` with resolved token counts. All fields are `number` (0 when the provider does not report a field).

```ts
import { agent } from "@pkg/agent-sdk";

const helper = agent({
  name: "helper",
  model: "openai/gpt-4.1",
  system: "You are a helpful assistant.",
});

const result = await helper.generate("What is TypeScript?");

if (result.ok) {
  console.log("Input tokens:", result.usage.inputTokens);
  console.log("Output tokens:", result.usage.outputTokens);
  console.log("Total tokens:", result.usage.totalTokens);
  console.log("Cache read:", result.usage.cacheReadTokens);
  console.log("Cache write:", result.usage.cacheWriteTokens);
  console.log("Reasoning:", result.usage.reasoningTokens);
}
```

### 2. Calculate cost with `@funkai/models`

Use `calculateCost()` to convert token counts into USD amounts. Look up model pricing with `model()`.

```ts
import { agent } from "@pkg/agent-sdk";
import { calculateCost, model } from "@funkai/models";

const summarizer = agent({
  name: "summarizer",
  model: "openai/gpt-4.1",
  system: "You produce concise summaries.",
});

const result = await summarizer.generate("Summarize the history of TypeScript.");

if (result.ok) {
  const modelDef = model("gpt-4.1");
  const cost = calculateCost(result.usage, modelDef.pricing);

  console.log("Input cost:", `$${cost.input.toFixed(6)}`);
  console.log("Output cost:", `$${cost.output.toFixed(6)}`);
  console.log("Cache read cost:", `$${cost.cacheRead.toFixed(6)}`);
  console.log("Cache write cost:", `$${cost.cacheWrite.toFixed(6)}`);
  console.log("Total cost:", `$${cost.total.toFixed(6)}`);
}
```

### 3. Enforce budget limits with hooks

Use the `onFinish` hook to track cumulative cost and abort when a budget is exceeded.

```ts
import { agent } from "@pkg/agent-sdk";
import { calculateCost, model } from "@funkai/models";

const modelId = "openai/gpt-4.1";
const modelDef = model("gpt-4.1");

let cumulativeCost = 0;
const budgetLimit = 0.5; // $0.50

const helper = agent({
  name: "budget-helper",
  model: modelId,
  system: "You are a helpful assistant.",
  onFinish: ({ result }) => {
    const cost = calculateCost(result.usage, modelDef.pricing);
    cumulativeCost += cost.total;
    console.log(`Cost: $${cost.total.toFixed(6)} | Cumulative: $${cumulativeCost.toFixed(6)}`);

    if (cumulativeCost > budgetLimit) {
      console.warn(`Budget exceeded: $${cumulativeCost.toFixed(4)} > $${budgetLimit}`);
    }
  },
});
```

### 4. Switch models based on task complexity

Use per-call overrides to select cheaper models for simple tasks and more capable models for complex ones.

```ts
import { agent } from "@pkg/agent-sdk";
import { z } from "zod";

const assistant = agent({
  name: "smart-assistant",
  model: "openai/gpt-4.1",
  input: z.object({
    question: z.string(),
    complexity: z.enum(["simple", "complex"]),
  }),
  prompt: ({ input }) => input.question,
});

const selectModel = (complexity: "simple" | "complex"): string =>
  complexity === "simple" ? "openai/gpt-4.1-mini" : "openai/gpt-4.1";

const result = await assistant.generate(
  { question: "What is 2 + 2?", complexity: "simple" },
  { model: selectModel("simple") },
);
```

### 5. Aggregate workflow cost

Workflow results include `result.usage` with aggregated token counts from all `$.agent()` calls. Combine with `calculateCost()` for the total workflow cost.

```ts
import { workflow, agent } from "@pkg/agent-sdk";
import { calculateCost, model } from "@funkai/models";
import { z } from "zod";

const analyzer = agent({
  name: "analyzer",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Analyze:\n\n${input.text}`,
});

const pipeline = workflow(
  {
    name: "analysis-pipeline",
    input: z.object({ texts: z.array(z.string()) }),
    output: z.object({
      analyses: z.array(z.string()),
      totalTokens: z.number(),
    }),
  },
  async ({ input, $ }) => {
    const results = await $.map({
      id: "analyze-all",
      input: input.texts,
      concurrency: 3,
      execute: async ({ item, index, $ }) => {
        const result = await $.agent({
          id: `analyze-${index}`,
          agent: analyzer,
          input: { text: item },
        });
        return result.ok ? result.value.output : "Analysis failed";
      },
    });

    const totalTokens = results.ok
      ? results.value.reduce((sum, r) => sum + r.usage.totalTokens, 0)
      : 0;

    return {
      analyses: results.ok ? results.value : [],
      totalTokens,
    };
  },
);

const result = await pipeline.generate({ texts: ["Text A", "Text B", "Text C"] });

if (result.ok) {
  const modelDef = model("gpt-4.1");
  const cost = calculateCost(result.usage, modelDef.pricing);
  console.log(`Workflow total: ${result.usage.totalTokens} tokens, $${cost.total.toFixed(6)}`);
}
```

### 6. Compare model costs before selecting

Use the `models()` function to list available models and compare pricing.

```ts
import { models } from "@funkai/models";

// Find all models and sort by input token cost
const allModels = models();
const sorted = [...allModels].sort((a, b) => a.pricing.input - b.pricing.input);

console.log("Cheapest models by input cost:");
for (const m of sorted.slice(0, 5)) {
  console.log(`  ${m.id}: $${(m.pricing.input * 1_000_000).toFixed(2)}/M input tokens`);
}
```

### 7. Log per-step costs in workflows

Use `onStepFinish` to calculate and log the cost of each agent step as it completes.

```ts
import { workflow, agent } from "@pkg/agent-sdk";
import { calculateCost, model } from "@funkai/models";
import { z } from "zod";

const modelId = "openai/gpt-4.1";
const modelDef = model("gpt-4.1");

const writer = agent({
  name: "writer",
  model: modelId,
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Write about: ${input.topic}`,
});

const traced = workflow(
  {
    name: "cost-traced",
    input: z.object({ topics: z.array(z.string()) }),
    output: z.object({ articles: z.array(z.string()) }),
    onStepFinish: ({ step, result, duration }) => {
      if (result !== undefined && "usage" in result && result.usage) {
        const cost = calculateCost(result.usage, modelDef.pricing);
        console.log(
          `[${step.id}] ${result.usage.totalTokens} tokens, $${cost.total.toFixed(6)}, ${duration}ms`,
        );
      }
    },
  },
  async ({ input, $ }) => {
    const articles = await $.map({
      id: "write-all",
      input: input.topics,
      concurrency: 2,
      execute: async ({ item, index, $ }) => {
        const result = await $.agent({
          id: `write-${index}`,
          agent: writer,
          input: { topic: item },
        });
        return result.ok ? result.value.output : "";
      },
    });

    return { articles: articles.ok ? articles.value : [] };
  },
);
```

## Verification

- `result.usage` contains non-negative token counts for all fields
- `calculateCost()` returns a `UsageCost` with `input`, `output`, `cacheRead`, `cacheWrite`, and `total` fields
- Budget hooks fire after each successful generation
- Workflow `result.usage` aggregates all `$.agent()` calls
- `model()` throws for unknown IDs; use `models()` to list available models

## Troubleshooting

### Token counts are all zero

**Issue:** The provider does not report usage for the model.

**Fix:** Not all providers report all token fields. Check `result.usage` directly. Unreported fields default to `0`.

### `model()` throws for unknown model ID

**Issue:** The model ID is not in the catalog.

**Fix:** Use the provider-native ID without the provider prefix (e.g. `"gpt-4.1"` not `"openai/gpt-4.1"`). Run `pnpm --filter=@funkai/models generate:models` to refresh the catalog if the model was recently added.

### Budget hook does not prevent the next call

**Issue:** The `onFinish` hook logs the budget exceeded warning but does not stop execution.

**Fix:** Hooks are observability callbacks -- they cannot abort execution. To enforce a hard budget, check the cumulative cost before each call and skip or abort manually using an `AbortController`.

### Workflow usage does not include non-agent steps

**Issue:** `result.usage` only includes tokens from `$.agent()` calls.

**Fix:** This is by design. Only agent steps produce token usage. Pure computation steps (`$.step`, `$.map` with non-agent logic) do not consume tokens.

## References

- [Token Usage](../provider/usage.md)
- [Models](../provider/models.md)
- [Hooks](../core/hooks.md)
- [Create an Agent](create-agent.md)
- [Create a Workflow](create-workflow.md)
