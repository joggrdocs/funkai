# Models

The SDK includes a model catalog with metadata and pricing for supported OpenRouter models. Used for cost calculation and model selection.

Model data is auto-generated from the OpenRouter API. Run `pnpm --filter=@funkai/agents generate:models` to refresh.

## Model Definition

Each model entry has:

| Field      | Type            | Description                                   |
| ---------- | --------------- | --------------------------------------------- |
| `id`       | `string`        | OpenRouter model ID (e.g. `'openai/gpt-4.1'`) |
| `category` | `ModelCategory` | `'chat'`, `'coding'`, or `'reasoning'`        |
| `pricing`  | `ModelPricing`  | Per-token rates (OpenRouter convention)       |

## Pricing

| Field               | Type     | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `prompt`            | `number` | USD per input token                   |
| `completion`        | `number` | USD per output token                  |
| `inputCacheRead`    | `number` | USD per cached input token (optional) |
| `inputCacheWrite`   | `number` | USD per cached input write (optional) |
| `webSearch`         | `number` | USD per web search request (optional) |
| `internalReasoning` | `number` | USD per reasoning token (optional)    |
| `image`             | `number` | USD per image input token (optional)  |

## Lookup

Three functions:

- `model(id)` -- Returns a single `ModelDefinition` or throws if the ID is not in the catalog.
- `tryModel(id)` -- Returns a single `ModelDefinition` or `undefined` if the ID is not in the catalog.
- `models(filter?)` -- Returns model definitions, optionally filtered by a predicate.

```ts
import { model, tryModel, models } from "@funkai/agents";

const m = model("openai/gpt-4.1");
console.log(m.pricing.prompt); // cost per input token
console.log(m.category); // 'chat'

const all = models();
const reasoning = models((m) => m.category === "reasoning");
```

## Adding a Model

Add an entry to `models.config.json` at the package root with the OpenRouter model ID and category, then run `pnpm --filter=@funkai/agents generate:models` to fetch pricing from the API.

## References

- [Provider Overview](overview.md)
- [Token Usage](usage.md)
