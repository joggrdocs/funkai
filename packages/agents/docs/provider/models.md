# Models

For model metadata, pricing, and catalog lookups, use the `@funkai/models` package.

## Model Definition

Each model entry has:

| Field          | Type                | Description                                   |
| -------------- | ------------------- | --------------------------------------------- |
| `id`           | `string`            | Model ID (e.g. `'gpt-4.1'`)                   |
| `capabilities` | `ModelCapabilities` | Boolean flags (reasoning, tools, vision, etc) |
| `pricing`      | `ModelPricing`      | Per-token rates in USD                        |
| `modalities`   | `ModelModalities`   | Input/output modality descriptors             |

## Pricing

| Field               | Type     | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `prompt`            | `number` | USD per input token                   |
| `completion`        | `number` | USD per output token                  |
| `inputCacheRead`    | `number` | USD per cached input token (optional) |
| `inputCacheWrite`   | `number` | USD per cached input write (optional) |
| `webSearch`         | `number` | USD per web search request (optional) |
| `internalReasoning` | `number` | USD per reasoning token (optional)    |
| `image`             | `number` | USD per image input token (optional)  |

## Lookup

```ts
import { model, models } from "@funkai/models";

// Look up a single model (returns null if not found)
const gpt4 = model("gpt-4.1");
if (gpt4) {
  console.log(gpt4.pricing.input); // cost per input token
}

// List all models, optionally filtered
const all = models();
const reasoning = models((m) => m.capabilities.reasoning);
```

## Using with Agents

Pass AI SDK provider instances directly to agents -- model catalog lookups are separate from model resolution:

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { model, calculateCost } from "@funkai/models";

const helper = agent({
  name: "helper",
  model: openai("gpt-4.1"),
  system: "You are helpful.",
});

const result = await helper.generate({ prompt: "Hello" });
if (result.ok) {
  const pricing = model("gpt-4.1")?.pricing;
  if (pricing) {
    const cost = calculateCost(result.usage, pricing);
    console.log(`Cost: $${cost.total.toFixed(6)}`);
  }
}
```

## References

- [Provider Overview](overview.md)
- [Token Usage](usage.md)
- [@funkai/models docs](/models)
