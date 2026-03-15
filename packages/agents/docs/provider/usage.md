# Token Usage

Token tracking and aggregation for agent and workflow executions.

## TokenUsageRecord

Raw tracking record from a single model invocation. Fields are `number | undefined` because not all providers report every field.

| Field              | Type                  | Description                              |
| ------------------ | --------------------- | ---------------------------------------- |
| `modelId`          | `string`              | OpenRouter model ID                      |
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
  workflowId?: string
  stepId?: string
  agentId: string
  scope: string[]
}
```

## Agent Usage

`agentUsage()` aggregates token counts from one or more raw records into a flat `AgentTokenUsage` object.

```ts
import { agentUsage } from "@funkai/agents";

const usage = agentUsage("my-agent", records);
console.log(usage.agentId); // 'my-agent'
console.log(usage.inputTokens); // resolved number (0 if undefined)
console.log(usage.outputTokens);
console.log(usage.totalTokens);
```

## Workflow Usage

`workflowUsage()` groups records by `source.agentId` and computes per-agent usage.

```ts
import { workflowUsage } from "@funkai/agents";

const usage = workflowUsage(allRecords);
for (const entry of usage.usages) {
  console.log(`${entry.agentId}: ${entry.totalTokens} tokens`);
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

## Usage Utilities

### `sumTokenUsage()`

Sum multiple `TokenUsage` objects into a new one. Pure function, does not mutate inputs.

```ts
import { sumTokenUsage } from "@funkai/agents";

const total = sumTokenUsage([usageA, usageB, usageC]);
```

### `collectUsages()`

Walk a `TraceEntry[]` tree and collect all `usage` values into a flat array (recursively including children). Compose with `sumTokenUsage()` to aggregate usage across all `$.agent()` calls.

```ts
import { collectUsages, sumTokenUsage } from "@funkai/agents";

const result = await myWorkflow.generate(input);
if (result.ok) {
  // result.usage is already computed, but you can also derive it from the trace:
  const usage = sumTokenUsage(collectUsages(result.trace));
}
```

## References

- [Models](models.md)
- [Provider Overview](overview.md)
