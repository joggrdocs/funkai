# Token Usage

Token tracking and aggregation for agent and flow agent executions.

## TokenUsageRecord

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
  flowAgentId?: string
  stepId?: string
  agentId: string
  scope: string[]
}
```

## Usage Aggregation

### `usage()`

Sum all token usage records into a single flat `TokenUsage`:

```ts
import { usage, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate({ input: { topic: "closures" } });
if (result.ok) {
  const total = usage(collectUsages(result.trace));
  console.log(total.inputTokens, total.outputTokens, total.totalTokens);
}
```

### `usageByAgent()`

Group records by agent ID and compute per-agent usage:

```ts
import { usageByAgent, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate({ input: { topic: "closures" } });
if (result.ok) {
  const byAgent = usageByAgent(collectUsages(result.trace));
  for (const entry of byAgent) {
    console.log(`${entry.source.agentId}: ${entry.totalTokens} tokens`);
  }
}
```

### `usageByModel()`

Group records by model ID and compute per-model usage:

```ts
import { usageByModel, collectUsages } from "@funkai/agents";

const result = await myFlowAgent.generate({ input: { topic: "closures" } });
if (result.ok) {
  const byModel = usageByModel(collectUsages(result.trace));
  for (const entry of byModel) {
    console.log(`${entry.modelId}: ${entry.totalTokens} tokens`);
  }
}
```

## TokenUsage (resolved)

The aggregated output type. All fields are resolved `number` (0 when the raw record was `undefined`).

| Field              | Type     | Description               |
| ------------------ | -------- | ------------------------- |
| `inputTokens`      | `number` | Total input tokens        |
| `outputTokens`     | `number` | Total output tokens       |
| `totalTokens`      | `number` | Input + output            |
| `cacheReadTokens`  | `number` | Cached input tokens       |
| `cacheWriteTokens` | `number` | Cache write tokens        |
| `reasoningTokens`  | `number` | Internal reasoning tokens |

## `collectUsages()`

Walk a `TraceEntry[]` tree and collect all `usage` values into a flat array (recursively including children). Compose with `usage()` to aggregate across all operations.

```ts
import { collectUsages, usage } from "@funkai/agents";

const result = await myFlowAgent.generate({ input: { topic: "closures" } });
if (result.ok) {
  const total = usage(collectUsages(result.trace));
}
```

## References

- [Models](models.md)
- [Provider Overview](overview.md)
