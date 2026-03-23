# Cost Tracking

Track token usage, calculate costs, enforce budgets, and optimize model selection for cost-efficient agents and flow agents.

## Prerequisites

- `@funkai/agents` installed
- `@funkai/models` installed (provides `calculateCost`, `model`, `models`)

## Track usage per agent call

Every successful `agent.generate()` returns `result.usage` with resolved token counts. All fields are `number` (0 when the provider does not report a field).

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
  console.log("Input tokens:", result.usage.inputTokens);
  console.log("Output tokens:", result.usage.outputTokens);
  console.log("Total tokens:", result.usage.totalTokens);
  console.log("Cache read:", result.usage.cacheReadTokens);
  console.log("Cache write:", result.usage.cacheWriteTokens);
  console.log("Reasoning:", result.usage.reasoningTokens);
}
```

## Calculate cost with `@funkai/models`

Use `calculateCost()` to convert token counts into USD amounts. Look up model pricing with `model()`.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { calculateCost, model } from "@funkai/models";

const summarizer = agent({
  name: "summarizer",
  model: openai("gpt-4.1"),
  system: "You produce concise summaries.",
});

const result = await summarizer.generate({ prompt: "Summarize the history of TypeScript." });

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

## Enforce budget limits with hooks

Use the `onFinish` hook to track cumulative cost and warn when a budget is exceeded.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { calculateCost, model } from "@funkai/models";

const modelDef = model("gpt-4.1");

let cumulativeCost = 0;
const budgetLimit = 0.5; // $0.50

const helper = agent({
  name: "budget-helper",
  model: openai("gpt-4.1"),
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

Hooks are observability callbacks — they cannot abort execution. To enforce a hard budget, check cumulative cost before each call and skip or abort manually using an `AbortController`.

## Switch models based on task complexity

Use per-call overrides to select cheaper models for simple tasks and more capable models for complex ones.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { LanguageModel } from "@funkai/models";

const assistant = agent({
  name: "smart-assistant",
  model: openai("gpt-4.1"),
  input: z.object({
    question: z.string(),
    complexity: z.enum(["simple", "complex"]),
  }),
  prompt: ({ input }) => input.question,
});

const selectModel = (complexity: "simple" | "complex"): LanguageModel =>
  complexity === "simple" ? openai("gpt-4.1-mini") : openai("gpt-4.1");

const result = await assistant.generate(
  { question: "What is 2 + 2?", complexity: "simple" },
  { model: selectModel("simple") },
);
```

## Compare model costs before selecting

Use the `models()` function to list available models and compare pricing.

```ts
import { models } from "@funkai/models";

const allModels = models();
const sorted = [...allModels].sort((a, b) => a.pricing.input - b.pricing.input);

console.log("Cheapest models by input cost:");
for (const m of sorted.slice(0, 5)) {
  console.log(`  ${m.id}: $${(m.pricing.input * 1_000_000).toFixed(2)}/M input tokens`);
}
```

## Aggregate flow agent cost

Flow agent results include `result.usage` with aggregated token counts from all `$.agent()` calls. Combine with `calculateCost()` for the total flow agent cost.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { calculateCost, model } from "@funkai/models";
import { z } from "zod";

const analyzer = agent({
  name: "analyzer",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Analyze:\n\n${input.text}`,
});

const pipeline = flowAgent(
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
        return {
          analysis: result.ok ? result.value.output : "Analysis failed",
          tokens: result.ok ? result.value.usage.totalTokens : 0,
        };
      },
    });

    const totalTokens = results.ok ? results.value.reduce((sum, r) => sum + r.tokens, 0) : 0;

    return {
      analyses: results.ok ? results.value.map((r) => r.analysis) : [],
      totalTokens,
    };
  },
);

const result = await pipeline.generate({ texts: ["Text A", "Text B", "Text C"] });

if (result.ok) {
  const modelDef = model("gpt-4.1");
  const cost = calculateCost(result.usage, modelDef.pricing);
  console.log(`Flow agent total: ${result.usage.totalTokens} tokens, $${cost.total.toFixed(6)}`);
}
```

## Log per-step costs in flow agents

Use `onStepFinish` to calculate and log the cost of each agent step as it completes.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { calculateCost, model } from "@funkai/models";
import { z } from "zod";

const modelDef = model("gpt-4.1");

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Write about: ${input.topic}`,
});

const traced = flowAgent(
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

## Collect usage from the trace

Use `collectUsages()` to recursively extract all `TokenUsage` values from a trace tree and compose with `usage()`, `usageByAgent()`, or `usageByModel()` for flexible aggregation.

### `collectUsages()`

Walks a `TraceEntry[]` tree and collects all `usage` values into a flat array (recursively including children). Entries without `usage` are skipped.

```ts
import { collectUsages, usage } from "@funkai/agents";

const result = await myFlowAgent.generate(input);
if (result.ok) {
  const total = usage(collectUsages(result.trace));
  console.log(total.inputTokens, total.outputTokens, total.totalTokens);
}
```

### `usage()` — sum all records

Sum all token usage records into a single flat `TokenUsage`:

```ts
import { usage, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate(input);
if (result.ok) {
  const total = usage(collectUsages(result.trace));
  console.log(total.inputTokens, total.outputTokens, total.totalTokens);
}
```

### `usageByAgent()` — group by agent

Group records by agent ID and compute per-agent usage:

```ts
import { usageByAgent, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate(input);
if (result.ok) {
  const byAgent = usageByAgent(collectUsages(result.trace));
  for (const entry of byAgent) {
    console.log(`${entry.source.agentId}: ${entry.totalTokens} tokens`);
  }
}
```

### `usageByModel()` — group by model

Group records by model ID and compute per-model usage:

```ts
import { usageByModel, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate(input);
if (result.ok) {
  const byModel = usageByModel(collectUsages(result.trace));
  for (const entry of byModel) {
    console.log(`${entry.modelId}: ${entry.totalTokens} tokens`);
  }
}
```

### Compute cost from trace

Combine `collectUsages()` with `calculateCost()` to aggregate cost across the full trace:

```ts
import { collectUsages } from "@funkai/agents";
import { calculateCost, model } from "@funkai/models";

const result = await myFlowAgent.generate(input);

if (result.ok) {
  const usages = collectUsages(result.trace);
  const m = model("gpt-4.1");
  const totalCost = usages.reduce((sum, u) => {
    const cost = calculateCost(u, m.pricing);
    return sum + cost.total;
  }, 0);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);
}
```

---

## Reference: TokenUsageRecord

Raw tracking record from a single model invocation. Fields are `number | undefined` because not all providers report every field.

| Field              | Type                  | Description                              |
| ------------------ | --------------------- | ---------------------------------------- |
| `modelId`          | `string`              | Model ID                                 |
| `inputTokens`      | `number \| undefined` | Input (prompt) tokens                    |
| `outputTokens`     | `number \| undefined` | Output (completion) tokens               |
| `totalTokens`      | `number \| undefined` | Input + output                           |
| `cacheReadTokens`  | `number \| undefined` | Tokens served from provider prompt cache |
| `cacheWriteTokens` | `number \| undefined` | Tokens written to prompt cache           |
| `reasoningTokens`  | `number \| undefined` | Internal reasoning tokens (e.g. o3/o4)   |
| `source`           | `object \| undefined` | Framework-populated source info          |

The `source` field identifies which component produced the record:

```ts
source?: {
  flowAgentId?: string;
  stepId?: string;
  agentId: string;
  scope: string[];
}
```

## Reference: TokenUsage (resolved)

The aggregated output type. All fields are resolved `number` (0 when the raw record was `undefined`).

| Field              | Type     | Description               |
| ------------------ | -------- | ------------------------- |
| `inputTokens`      | `number` | Total input tokens        |
| `outputTokens`     | `number` | Total output tokens       |
| `totalTokens`      | `number` | Input + output            |
| `cacheReadTokens`  | `number` | Cached input tokens       |
| `cacheWriteTokens` | `number` | Cache write tokens        |
| `reasoningTokens`  | `number` | Internal reasoning tokens |

---

## Troubleshooting

### Token counts are all zero

Not all providers report all token fields. Check `result.usage` directly. Unreported fields default to `0`.

### `model()` throws for unknown model ID

Use the provider-native ID without the provider prefix (e.g. `"gpt-4.1"` not `"openai/gpt-4.1"`). Run `pnpm --filter=@funkai/models generate:models` to refresh the catalog if the model was recently added.

### Budget hook does not prevent the next call

Hooks are observability callbacks — they cannot abort execution. To enforce a hard budget, check the cumulative cost before each call and skip or abort manually using an `AbortController`.

### Flow agent usage does not include non-agent steps

`result.usage` only includes tokens from `$.agent()` calls. This is by design. Pure computation steps (`$.step`, `$.map` with non-agent logic) do not consume tokens.

---

## See also

- [Create an Agent](create-agent.md)
- [Create a Flow Agent](create-flow-agent.md)
- [Hooks](hooks.md)
