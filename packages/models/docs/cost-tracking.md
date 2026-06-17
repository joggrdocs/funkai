# Cost Tracking

`calculateCost()` computes the USD cost of a model invocation by multiplying token counts against per-token pricing rates from the catalog.

## calculateCost() API

```ts
import { calculateCost, model } from "@funkai/models";
import type { LanguageModelUsage } from "ai";

const m = model("gpt-4.1");
if (m) {
  const cost = calculateCost(usage, m.pricing);
}
```

## Types

### LanguageModelUsage

Token counts from a model invocation (from the `ai` SDK):

| Field                | Type                       | Description                                      |
| -------------------- | -------------------------- | ------------------------------------------------ |
| `inputTokens`        | `number`                   | Number of input (prompt) tokens                  |
| `outputTokens`       | `number`                   | Number of output (completion) tokens             |
| `totalTokens`        | `number`                   | Total tokens (input + output)                    |
| `inputTokenDetails`  | `object \| undefined`      | Breakdown with `cacheReadTokens`, `cacheWriteTokens`, `noCacheTokens` |
| `outputTokenDetails` | `object \| undefined`      | Breakdown with `textTokens`, `reasoningTokens`   |

### ModelPricing

Per-token pricing rates from the model catalog:

| Field        | Type                  | Description                       |
| ------------ | --------------------- | --------------------------------- |
| `input`      | `number`              | Cost per input token (USD)        |
| `output`     | `number`              | Cost per output token (USD)       |
| `cacheRead`  | `number \| undefined` | Cost per cached read token (USD)  |
| `cacheWrite` | `number \| undefined` | Cost per cached write token (USD) |
| `reasoning`  | `number \| undefined` | Cost per reasoning token (USD)    |

Pricing rates are stored per-token in the catalog (converted from per-million at generation time). No runtime conversion is needed.

### UsageCost

The output of `calculateCost()`:

| Field        | Type     | Description                  |
| ------------ | -------- | ---------------------------- |
| `input`      | `number` | Cost for input tokens        |
| `output`     | `number` | Cost for output tokens       |
| `cacheRead`  | `number` | Cost for cached read tokens  |
| `cacheWrite` | `number` | Cost for cached write tokens    |
| `reasoning`  | `number` | Cost for reasoning tokens       |
| `total`      | `number` | Sum of all cost fields          |

All fields are non-negative. Fields that don't apply are `0`.

## Basic Usage

```ts
const m = model("gpt-4.1");
if (!m) {
  throw new Error("Model not found in catalog");
}

const usage: LanguageModelUsage = {
  inputTokens: 1500,
  outputTokens: 800,
  totalTokens: 2300,
  inputTokenDetails: { cacheReadTokens: 500, cacheWriteTokens: 0, noCacheTokens: 1000 },
  outputTokenDetails: { textTokens: 800, reasoningTokens: 0 },
};

const cost = calculateCost(usage, m.pricing);
console.log(`Total: $${cost.total.toFixed(6)}`);
```

## Cost Breakdown

```ts
const cost = calculateCost(usage, m.pricing);

console.log(`Input:       $${cost.input.toFixed(6)}`);
console.log(`Output:      $${cost.output.toFixed(6)}`);
console.log(`Cache read:  $${cost.cacheRead.toFixed(6)}`);
console.log(`Cache write: $${cost.cacheWrite.toFixed(6)}`);
console.log(`Reasoning:   $${cost.reasoning.toFixed(6)}`);
console.log(`Total:       $${cost.total.toFixed(6)}`);
```

## Accumulating Costs Across Calls

```ts
const totalCost = runs.reduce((sum, run) => {
  const runModel = model(run.modelId);
  if (!runModel) return sum;
  return sum + calculateCost(run.usage, runModel.pricing).total;
}, 0);

console.log(`Session total: $${totalCost.toFixed(6)}`);
```

## Comparing Model Costs

Estimate the cost of a workload across different models:

```ts
const usage: LanguageModelUsage = {
  inputTokens: 10_000,
  outputTokens: 2_000,
  totalTokens: 12_000,
};

const candidates = models((m) => m.capabilities.reasoning);

const costs = candidates.map((m) => ({
  id: m.id,
  total: calculateCost(usage, m.pricing).total,
}));

const sorted = costs.toSorted((a, b) => a.total - b.total);
```

## Calculation Formula

```text
input      = (noCacheTokens ?? inputTokens ?? 0)  * pricing.input
output     = (textTokens ?? outputTokens ?? 0)     * pricing.output
cacheRead  = (cacheReadTokens ?? 0)                * (pricing.cacheRead  ?? 0)
cacheWrite = (cacheWriteTokens ?? 0)               * (pricing.cacheWrite ?? 0)
reasoning  = (reasoningTokens ?? 0)                * (pricing.reasoning  ?? 0)
total      = input + output + cacheRead + cacheWrite + reasoning
```

When token detail fields are available (`inputTokenDetails`, `outputTokenDetails`), they take priority over the top-level counts. For input cost, `noCacheTokens` is preferred over `inputTokens` to avoid double-counting cached tokens. For output cost, `textTokens` is preferred over `outputTokens` to separate text from reasoning. Optional pricing fields (`cacheRead`, `cacheWrite`, `reasoning`) default to `0` when absent.

## References

- [Model Catalog](catalog.md)
- [Provider Resolution](provider-resolution.md)
- [Troubleshooting](troubleshooting.md)
