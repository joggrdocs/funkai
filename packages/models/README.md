<div align="center">
  <p><strong>@funkai/models</strong></p>
  <p>Model catalog, provider resolution, and cost calculations for the funkai AI SDK.</p>

<a href="https://www.npmjs.com/package/@funkai/models"><img src="https://img.shields.io/npm/v/@funkai/models" alt="npm version" /></a>
<a href="https://github.com/joggrdocs/funkai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/joggrdocs/funkai" alt="License" /></a>

</div>

## Features

- :books: **300+ model catalog** — Unified catalog across 20+ providers, sourced from models.dev.
- :dart: **Type-safe model IDs** — Autocomplete for all cataloged models while accepting arbitrary strings.
- :electric_plug: **Provider resolution** — Map `"provider/model"` strings to AI SDK `LanguageModel` instances.
- :moneybag: **Cost calculation** — Calculate USD cost from token usage and per-token pricing.
- :package: **Subpath imports** — Per-provider imports for filtered model lists and typed IDs with zero-bundle overhead.

## Install

```bash
npm install @funkai/models
```

## Usage

### Look up a model

```ts
import { model } from "@funkai/models";

const gpt = model("gpt-4.1");

if (gpt) {
  console.log(gpt.name); // "GPT-4.1"
  console.log(gpt.contextWindow); // 1047576
  console.log(gpt.pricing.input); // cost per input token in USD
  console.log(gpt.capabilities); // { reasoning, toolCall, ... }
}
```

### Filter models

```ts
import { models } from "@funkai/models";

const reasoning = models((m) => m.capabilities.reasoning);
const vision = models((m) => m.modalities.input.includes("image"));
const cheap = models((m) => m.capabilities.toolCall).toSorted(
  (a, b) => a.pricing.input - b.pricing.input,
);
```

### Resolve providers

```ts
import { createProviderRegistry } from "@funkai/models";
import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic,
  },
});

// Returns a LanguageModel — pass directly to agent()
const lm = registry("openai/gpt-4.1");
```

### Calculate costs

```ts
import { model, calculateCost } from "@funkai/models";

const m = model("gpt-4.1");
if (m) {
  const cost = calculateCost(
    {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    },
    m.pricing,
  );
  console.log(`Total: $${cost.total.toFixed(6)}`);
}
```

## API

| Export                   | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `model(id)`              | Look up a single model definition by ID                |
| `models(filter?)`        | Return all models, optionally filtered by a predicate  |
| `MODELS`                 | Complete readonly array of all model definitions       |
| `createProviderRegistry` | Create a registry that resolves model IDs to providers |
| `calculateCost`          | Calculate USD cost from token usage and pricing        |

## Subpath Exports

Per-provider subpath imports give access to filtered model lists and typed IDs:

```ts
import { openAIModels, openAIModel } from "@funkai/models/openai";
import { anthropicModels } from "@funkai/models/anthropic";
```

Available for: `openai`, `anthropic`, `google`, `google-vertex`, `mistral`, `amazon-bedrock`, `groq`, `deepseek`, `xai`, `cohere`, `fireworks-ai`, `togetherai`, `deepinfra`, `cerebras`, `perplexity`, `openrouter`, `llama`, `alibaba`, `nvidia`, `huggingface`, `inception`.

## Documentation

For comprehensive documentation, see the [Models concept](/concepts/models) and [`model()` reference](/reference/models/model).

## License

[MIT](https://github.com/joggrdocs/funkai/blob/main/LICENSE)
