# calculateCost()

Calculate the USD cost of a model invocation from token usage counts and per-token pricing. Pair with `model()` to get pricing from the catalog, or pass pricing directly.

## Function Signature

```typescript
function calculateCost(usage: TokenUsage, pricing: ModelPricing): UsageCost;
```

## Parameters

### TokenUsage

Aggregated token counts from a model invocation. All fields are resolved `number` values — `0` when the provider does not report a given field. See [`createProviderRegistry()` reference](/reference/models/provider-registry#tokenusage) for the full type definition.

### ModelPricing

```typescript
interface ModelPricing {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
  readonly cacheWrite?: number;
  readonly reasoning?: number;
}
```

| Field        | Type     | Required | Description                                  |
| ------------ | -------- | -------- | -------------------------------------------- |
| `input`      | `number` | Yes      | Cost per input token in USD                  |
| `output`     | `number` | Yes      | Cost per output token in USD                 |
| `cacheRead`  | `number` | No       | Cost per cached read token; defaults to `0`  |
| `cacheWrite` | `number` | No       | Cost per cached write token; defaults to `0` |
| `reasoning`  | `number` | No       | Cost per reasoning token; defaults to `0`    |

Rates are per-token in USD, pre-converted from per-million-token values at catalog generation time.

## UsageCost Return Type

```typescript
interface UsageCost {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly reasoning: number;
  readonly total: number;
}
```

| Field        | Type     | Description                         |
| ------------ | -------- | ----------------------------------- |
| `input`      | `number` | Cost for input tokens in USD        |
| `output`     | `number` | Cost for output tokens in USD       |
| `cacheRead`  | `number` | Cost for cached read tokens in USD  |
| `cacheWrite` | `number` | Cost for cached write tokens in USD |
| `reasoning`  | `number` | Cost for reasoning tokens in USD    |
| `total`      | `number` | Sum of all fields in USD            |

All fields are non-negative. Fields that don't apply are `0`.

## Formula

```
input     = usage.inputTokens     * pricing.input
output    = usage.outputTokens    * pricing.output
cacheRead = usage.cacheReadTokens * (pricing.cacheRead  ?? 0)
cacheWrite= usage.cacheWriteTokens* (pricing.cacheWrite ?? 0)
reasoning = usage.reasoningTokens * (pricing.reasoning  ?? 0)
total     = input + output + cacheRead + cacheWrite + reasoning
```

## Usage Helpers

> These functions are exported from `@funkai/agents`, not `@funkai/models`.

These functions operate on `TokenUsageRecord[]` — the raw tracking records collected from agent execution traces.

### usage()

```typescript
function usage(records: TokenUsageRecord[]): TokenUsage;
```

Sum all token usage records into a single flat `TokenUsage`. Treats `undefined` fields as `0`. Returns zero-valued usage for an empty array.

### usageByAgent()

```typescript
function usageByAgent(records: TokenUsageRecord[]): readonly AgentTokenUsage[];
```

Group and aggregate usage by agent. Records without an `agentId` are grouped as `{ type: 'unattributed' }`.

```typescript
interface AgentTokenUsage extends TokenUsage {
  readonly source: AgentSource | UnattributedSource;
}

interface AgentSource {
  readonly type: "agent";
  readonly agentId: string;
}

interface UnattributedSource {
  readonly type: "unattributed";
}
```

### usageByModel()

```typescript
function usageByModel(records: TokenUsageRecord[]): readonly ModelTokenUsage[];
```

Group and aggregate usage by model ID.

```typescript
interface ModelTokenUsage extends TokenUsage {
  readonly modelId: string;
}
```

### collectUsages()

```typescript
function collectUsages(trace: readonly TraceEntry[]): TokenUsage[];
```

Recursively walk a `FlowAgentGenerateResult.trace` tree and extract all `TokenUsage` values. Entries without usage are skipped. Returns a flat array suitable for passing to `usage()`, `usageByAgent()`, or `usageByModel()`.

## Combined Example

```typescript
import { calculateCost, model } from '@funkai/models'
import { collectUsages, usage, usageByAgent, usageByModel } from '@funkai/agents'

// From a flow agent result
const result = await myFlow.generate({ input: { ... } })
if (!result.ok) return

// Collect raw usage records from the trace
const records = collectUsages(result.trace)

// Aggregate total usage
const totals = usage(records)

// Per-agent breakdown
const perAgent = usageByAgent(records)

// Per-model breakdown
const perModel = usageByModel(records)

// Calculate cost using catalog pricing
const m = model('gpt-4.1')
if (m) {
  const cost = calculateCost(totals, m.pricing)
  console.log(`Total cost: $${cost.total.toFixed(6)}`)
  console.log(`Input: $${cost.input.toFixed(6)}`)
  console.log(`Output: $${cost.output.toFixed(6)}`)
}
```

## See Also

- [Cost Tracking guide](/guides/cost-tracking) — patterns for budget enforcement and per-step cost logging
- [`model()` reference](/reference/models/model) — look up model pricing from the catalog
- [`createProviderRegistry()` reference](/reference/models/provider-registry) — resolve model IDs to providers
