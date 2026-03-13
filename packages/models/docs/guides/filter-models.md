# Filter Models

Common patterns for finding the right model from the catalog using `models()` predicates.

## Prerequisites

- `@funkai/models` installed

## Steps

### 1. Import the Catalog Functions

```ts
import { models, model } from "@funkai/models";
```

### 2. Filter by Capability

Find models with specific capabilities:

```ts
const reasoning = models((m) => m.capabilities.reasoning);
const withTools = models((m) => m.capabilities.toolCall);
const structured = models((m) => m.capabilities.structuredOutput);
```

### 3. Filter by Provider

Narrow to a specific provider:

```ts
const openai = models((m) => m.provider === "openai");
```

Or use the subpath export:

```ts
import { openAIModels } from "@funkai/models/openai";
```

### 4. Combine Conditions

Chain multiple requirements:

```ts
const ideal = models(
  (m) =>
    m.capabilities.reasoning &&
    m.capabilities.toolCall &&
    m.contextWindow >= 128_000 &&
    m.pricing.input < 0.00001,
);
```

### 5. Sort by Price

Find the cheapest model matching your criteria:

```ts
const cheapest = models((m) => m.capabilities.reasoning).toSorted(
  (a, b) => a.pricing.input - b.pricing.input,
);

const pick = cheapest[0];
```

### 6. Find Multimodal Models

```ts
const vision = models((m) => m.modalities.input.includes("image"));
const audio = models((m) => m.modalities.input.includes("audio"));
```

## Verification

Verify your filter returns expected results:

```ts
const results = models((m) => m.capabilities.reasoning && m.provider === "openai");

for (const m of results) {
  console.log(m.id, m.name, m.pricing.input);
}
```

## Troubleshooting

### Filter returns empty array

**Issue:** No models match your predicate.

**Fix:** Relax your filter conditions. Check which values exist in the catalog:

```ts
const providers = [...new Set(models().map((m) => m.provider))];
console.log(providers);
```

### Model not found in catalog

**Issue:** `model(id)` returns `null` for a model you expect to exist.

**Fix:** The catalog is generated periodically. Regenerate it to include new models:

```bash
pnpm --filter=@funkai/models generate:models
```

## References

- [Model Catalog](../catalog/overview.md)
- [Filtering](../catalog/filtering.md)
- [Providers](../catalog/providers.md)
