# Filtering Models

Advanced patterns for filtering the model catalog using `models()` predicates.

## Key Concepts

### Predicate-Based Filtering

`models()` accepts an optional predicate function `(m: ModelDefinition) => boolean`. When provided, only models where the predicate returns `true` are included. When omitted, the full catalog is returned.

```ts
const filtered = models((m) => m.capabilities.reasoning);
```

## Usage

### Filter by Capability

```ts
const reasoning = models((m) => m.capabilities.reasoning);
const withTools = models((m) => m.capabilities.toolCall);
const structured = models((m) => m.capabilities.structuredOutput);
```

### Filter by Provider

```ts
const openai = models((m) => m.provider === "openai");
const anthropic = models((m) => m.provider === "anthropic");
```

### Filter by Modality

```ts
const vision = models((m) => m.modalities.input.includes("image"));
const audio = models((m) => m.modalities.input.includes("audio"));
const multimodal = models((m) => m.modalities.input.length > 1);
```

### Filter by Context Window

```ts
const largeContext = models((m) => m.contextWindow >= 128_000);
const longOutput = models((m) => m.maxOutput >= 16_000);
```

### Filter by Pricing

```ts
const cheapInput = models((m) => m.pricing.input < 0.000001);
const withCache = models((m) => m.pricing.cacheRead != null);
```

### Filter by Family

```ts
const gpt = models((m) => m.family === "gpt");
const claude = models((m) => m.family.startsWith("claude"));
```

### Combine Multiple Conditions

```ts
const ideal = models(
  (m) => m.capabilities.reasoning && m.capabilities.toolCall && m.contextWindow >= 128_000,
);
```

### Chain Filters with Array Methods

Since `models()` returns `readonly ModelDefinition[]`, standard array methods work:

```ts
const sorted = models((m) => m.capabilities.reasoning).toSorted(
  (a, b) => a.pricing.input - b.pricing.input,
);

const cheapest = sorted[0];
```

### Extract Unique Values

```ts
const providers = [...new Set(models().map((m) => m.provider))];
const families = [...new Set(models().map((m) => m.family))];
```

### Per-Provider Filtering

Use subpath exports for provider-scoped operations:

```ts
import { openAIModels } from "@funkai/models/openai";

const reasoningGpt = openAIModels.filter((m) => m.capabilities.reasoning);
```

## References

- [Model Catalog](overview.md)
- [Providers](providers.md)
- [Filter Models Guide](../guides/filter-models.md)
