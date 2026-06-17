# Track Costs

Calculate and accumulate token costs from model invocations using `calculateCost()`.

## Prerequisites

- `@funkai/models` installed
- Token usage data from model invocations (e.g. from `@funkai/agents` execution traces)

## Steps

### 1. Import Cost Functions

```ts
import { calculateCost, model } from "@funkai/models";
import type { LanguageModelUsage } from "ai";
```

### 2. Get Model Pricing

Look up the model definition to access its pricing:

```ts
const m = model("gpt-4.1");
if (!m) {
  throw new Error("Model not found in catalog");
}
```

### 3. Calculate Cost for a Single Invocation

```ts
const usage: LanguageModelUsage = {
  inputTokens: 1500,
  outputTokens: 800,
  totalTokens: 2300,
  inputTokenDetails: { cacheReadTokens: 500, cacheWriteTokens: 0, noCacheTokens: 1000 },
  outputTokenDetails: { textTokens: 800, reasoningTokens: 0 },
};

const cost = calculateCost(usage, m.pricing);

console.log(`Input:  $${cost.input.toFixed(6)}`);
console.log(`Output: $${cost.output.toFixed(6)}`);
console.log(`Total:  $${cost.total.toFixed(6)}`);
```

### 4. Accumulate Costs Across Multiple Calls

```ts
const totalCost = runs.reduce((sum, run) => {
  const runModel = model(run.modelId);
  if (!runModel) return sum;
  return sum + calculateCost(run.usage, runModel.pricing).total;
}, 0);

console.log(`Session total: $${totalCost.toFixed(6)}`);
```

### 5. Compare Model Costs

Estimate the cost of a workload across different models:

```ts
const usage: LanguageModelUsage = {
  inputTokens: 10_000,
  outputTokens: 2_000,
  totalTokens: 12_000,
};

const candidates = ["gpt-4.1", "claude-sonnet-4-20250514"] as const;

for (const id of candidates) {
  const m = model(id);
  if (!m) continue;
  const cost = calculateCost(usage, m.pricing);
  console.log(`${id}: $${cost.total.toFixed(6)}`);
}
```

## Verification

Verify cost calculation with known values:

```ts
const usage: LanguageModelUsage = {
  inputTokens: 1_000_000,
  outputTokens: 0,
  totalTokens: 1_000_000,
};

const m = model("gpt-4.1");
if (m) {
  const cost = calculateCost(usage, m.pricing);
  console.log(`1M input tokens: $${cost.total.toFixed(4)}`);
}
```

## Troubleshooting

### Cost is 0 for all fields

**Issue:** Token counts are all zero or the pricing rates are zero.

**Fix:** Verify the `LanguageModelUsage` object has non-zero values and the model exists in the catalog:

```ts
console.log(usage);
console.log(m.pricing);
```

### Cache costs are always 0

**Issue:** The model's pricing does not include `cacheRead` or `cacheWrite` rates.

**Fix:** Not all models support prompt caching. Check whether the model's pricing includes cache fields:

```ts
console.log(m.pricing.cacheRead);
console.log(m.pricing.cacheWrite);
```

## References

- [Cost Calculation](../cost/overview.md)
- [Model Catalog](../catalog/overview.md)
