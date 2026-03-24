# Provider Overview

Agents require an AI SDK `LanguageModel` instance for their `model` field. The `@funkai/agents` package does not bundle any provider -- you bring your own from the AI SDK ecosystem.

## Passing a Model

Use any `@ai-sdk/*` provider package to create a language model instance:

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const helper = agent({
  name: "helper",
  model: openai("gpt-4.1"),
  system: "You are a helpful assistant.",
});
```

## Supported Providers

Any package that returns an AI SDK v3 `LanguageModel` works:

| Package                       | Example                                 |
| ----------------------------- | --------------------------------------- |
| `@ai-sdk/openai`              | `openai("gpt-4.1")`                     |
| `@ai-sdk/anthropic`           | `anthropic("claude-sonnet-4-20250514")` |
| `@ai-sdk/google`              | `google("gemini-2.5-pro")`              |
| `@openrouter/ai-sdk-provider` | `createOpenRouter()("openai/gpt-4.1")`  |

## Dynamic Model Resolution

Use a resolver function to pick models at runtime:

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const helper = agent({
  name: "helper",
  model: ({ input }) =>
    input.fast ? openai("gpt-4.1-mini") : anthropic("claude-sonnet-4-20250514"),
  input: z.object({ fast: z.boolean() }),
  system: "You are a helpful assistant.",
});
```

## Model Catalog

For model metadata and pricing, use `@funkai/models`:

```ts
import { model, models } from "@funkai/models";

const gpt4 = model("openai/gpt-4.1");
console.log(gpt4?.pricing.prompt); // cost per input token

const reasoning = models((m) => m.capabilities.reasoning);
```

## Token Usage

Aggregate token counts across agent and flow agent executions:

```ts
import { usage, usageByAgent, usageByModel, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate({ input: { topic: "closures" } });
if (result.ok) {
  const records = collectUsages(result.trace);
  const total = usage(records);
  const byAgent = usageByAgent(records);
  const byModel = usageByModel(records);
}
```

## Exports

| Export                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `usage(records)`        | Sum all token usage records into a single total |
| `usageByAgent(records)` | Group and sum usage by agent ID                 |
| `usageByModel(records)` | Group and sum usage by model ID                 |
| `collectUsages(trace)`  | Walk a trace tree and collect all usage records |

## References

- [Models](models.md)
- [Token Usage](usage.md)
- [Create an Agent](../guides/create-agent.md)
