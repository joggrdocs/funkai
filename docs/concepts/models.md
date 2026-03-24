# Models

`@funkai/models` covers three domains: a catalog of 300+ models sourced from [models.dev](https://models.dev), provider resolution that maps model IDs to AI SDK `LanguageModel` instances, and cost calculation from token usage.

## Model catalog

`model(id)` looks up a single model definition. `models(filter?)` returns the full catalog or a filtered subset.

```typescript
import { model, models } from "@funkai/models";

// Single lookup — returns ModelDefinition | null
const gpt41 = model("openai/gpt-4.1");
if (gpt41) {
  console.log(gpt41.name);
  console.log(gpt41.contextWindow);
  console.log(gpt41.capabilities.toolCall); // boolean
  console.log(gpt41.pricing.input); // cost per input token in USD
}

// Filtered list
const reasoningModels = models((m) => m.capabilities.reasoning);
const openaiModels = models((m) => m.provider === "openai");
```

`ModelDefinition` includes: `id`, `name`, `provider`, `family`, `contextWindow`, `maxOutput`, `pricing`, `capabilities`, and `modalities`.

## Provider resolution

`createProviderRegistry()` maps provider prefixes to AI SDK provider factories. Call the returned registry with a `"provider/model"` ID to get a `LanguageModel` instance.

```typescript
import { createProviderRegistry } from "@funkai/models";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  },
});

// Returns a LanguageModel — pass directly to agent()
const lm = registry("openai/gpt-4.1");
```

The prefix before the first `/` selects the provider factory. Model IDs without a `/` throw — always use the full `"provider/model"` format.

## Cost calculation

`calculateCost()` takes a `TokenUsage` object and a `ModelPricing` object (from a `ModelDefinition`) and returns a `UsageCost` breakdown.

```typescript
import { model, calculateCost } from "@funkai/models";

const m = model("openai/gpt-4.1");

if (m) {
  const cost = calculateCost(
    {
      inputTokens: 1_000,
      outputTokens: 500,
      totalTokens: 1_500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    },
    m.pricing,
  );

  console.log(`Total: $${cost.total.toFixed(6)}`);
  // cost.input, cost.output, cost.cacheRead, cost.cacheWrite are also available
}
```

Token usage from agent results (`result.usage`) can be passed directly to `calculateCost()`.

## References

- [`model()` & `models()` reference](/reference/models/model)
- [`createProviderRegistry()` reference](/reference/models/provider-registry)
- [`calculateCost()` reference](/reference/models/calculate-cost)
- [Cost Tracking guide](/guides/cost-tracking)
