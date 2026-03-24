# models()

Return the full model catalog or a filtered subset. Use predicate functions to filter by capability, provider, modality, context window, pricing, or any combination.

## Function Signature

```typescript
function models(filter?: (m: ModelDefinition) => boolean): readonly ModelDefinition[];
```

| Parameter | Type                              | Description                                   |
| --------- | --------------------------------- | --------------------------------------------- |
| `filter`  | `(m: ModelDefinition) => boolean` | Optional predicate; omit to return all models |

**Returns:** `readonly ModelDefinition[]`

## MODELS

```typescript
const MODELS: readonly ModelDefinition[];
```

Full catalog array. All models from all providers, generated from models.dev.

## Filtering Patterns

```typescript
import { models } from "@funkai/models";

// By capability
const reasoning = models((m) => m.capabilities.reasoning);
const withTools = models((m) => m.capabilities.toolCall);

// By provider
const openai = models((m) => m.provider === "openai");

// By modality
const vision = models((m) => m.modalities.input.includes("image"));

// By context window
const large = models((m) => m.contextWindow >= 128_000);

// Combined
const ideal = models(
  (m) => m.capabilities.reasoning && m.capabilities.toolCall && m.contextWindow >= 128_000,
);

// Sort by price
const cheapest = models((m) => m.capabilities.reasoning).toSorted(
  (a, b) => a.pricing.input - b.pricing.input,
);
```

## See Also

- [Models concept](/concepts/models) — overview with usage examples
- [`model()` reference](/reference/models/model) — type definitions for `ModelDefinition`, `ModelPricing`, `ModelCapabilities`, `ModelModalities`
- [`calculateCost()` reference](/reference/models/calculate-cost) — compute cost from usage
