# Provider Overview

The provider module integrates with OpenRouter for model access and provides a model catalog with pricing data.

## OpenRouter

All models are accessed via OpenRouter. The `openrouter()` function creates a language model from a model ID.

```ts
import { openrouter } from '@pkg/agent-sdk'

const m = openrouter('openai/gpt-4.1')
```

The provider instance is cached at module scope and reused across calls. If `OPENROUTER_API_KEY` changes at runtime, the cache is invalidated and a new provider is created.

## API Key

Resolved from the `OPENROUTER_API_KEY` environment variable. Throws if not set.

```ts
// Override with a custom provider instance
import { createOpenRouter } from '@pkg/agent-sdk'

const provider = createOpenRouter({ apiKey: 'sk-...' })
const m = provider('openai/gpt-4.1')
```

## Model Catalog

Models are defined in `models.config.json` and auto-generated into provider-specific files. Use the catalog functions to look up model definitions and pricing.

```ts
import { model, tryModel, models } from '@pkg/agent-sdk'

// Look up a model (throws if not found)
const gpt4 = model('openai/gpt-4.1')
console.log(gpt4.pricing.prompt) // cost per input token

// Safe lookup (returns undefined if not found)
const maybe = tryModel('openai/gpt-4.1')

// List all models, optionally filtered
const allModels = models()
const reasoningModels = models((m) => m.category === 'reasoning')
```

## Token Usage

Aggregate token counts across agent and workflow executions.

```ts
import { agentUsage, workflowUsage } from '@pkg/agent-sdk'

// Single agent usage
const usage = agentUsage('my-agent', tokenRecords)
console.log(usage.inputTokens, usage.outputTokens, usage.totalTokens)

// Workflow usage with per-agent breakdown
const wfUsage = workflowUsage(allTokenRecords)
for (const entry of wfUsage.usages) {
  console.log(`${entry.agentId}: ${entry.totalTokens} tokens`)
}
```

## Exports

| Export                         | Description                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| `openrouter(modelId)`          | Create a language model from OpenRouter (cached provider)         |
| `createOpenRouter(options?)`   | Create a custom OpenRouter provider instance                      |
| `model(id)`                    | Look up a model definition from the catalog (throws if not found) |
| `tryModel(id)`                 | Look up a model definition (returns `undefined` if not found)     |
| `models(filter?)`              | Get model definitions, optionally filtered by predicate           |
| `agentUsage(agentId, records)` | Aggregate token counts for a single agent                         |
| `workflowUsage(records)`       | Aggregate token counts for a workflow with per-agent breakdown    |

## Model Reference

String model IDs passed to `agent()` or `openrouter()` are resolved via OpenRouter at runtime. You can also pass an AI SDK `LanguageModel` instance directly.

```ts
import { agent } from '@pkg/agent-sdk'

// String ID -- resolved via OpenRouter
const a1 = agent({
  name: 'my-agent',
  model: 'openai/gpt-4.1',
  system: 'You are helpful.',
})

// AI SDK provider instance -- bypasses OpenRouter
import { openai } from '@ai-sdk/openai'

const a2 = agent({
  name: 'my-agent',
  model: openai('gpt-4.1'),
  system: 'You are helpful.',
})
```

## References

- [Models](models.md)
- [Create an Agent](../guides/create-agent.md)
- [Troubleshooting](../troubleshooting.md)
