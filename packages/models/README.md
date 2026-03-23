# @funkai/models

Model catalog, provider resolution, and cost calculations for the funkai AI SDK.

## Quick Start

```ts
import { model, models, createProviderRegistry, calculateCost } from "@funkai/models";
import { createOpenAI } from "@ai-sdk/openai";

const gpt = model("openai/gpt-4.1");

const reasoning = models((m) => m.capabilities.reasoning);

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
});
const lm = registry("openai/gpt-4.1");
```

## API Reference

### Catalog

| Export   | Type       | Description                                      |
| -------- | ---------- | ------------------------------------------------ |
| `model`  | `function` | Look up a single model definition by ID          |
| `models` | `function` | Return all models, optionally filtered           |
| `MODELS` | `const`    | Complete readonly array of all model definitions |

### Provider Resolution

| Export                   | Type       | Description                                                     |
| ------------------------ | ---------- | --------------------------------------------------------------- |
| `createProviderRegistry` | `function` | Create a registry that resolves model IDs to provider instances |

### Cost Calculation

| Export          | Type       | Description                                   |
| --------------- | ---------- | --------------------------------------------- |
| `calculateCost` | `function` | Calculate USD cost from token usage + pricing |

### Types

| Export                   | Kind   | Description                                       |
| ------------------------ | ------ | ------------------------------------------------- |
| `ModelDefinition`        | `type` | Full model metadata with pricing and capabilities |
| `ModelId`                | `type` | Model identifier with autocomplete support        |
| `KnownModelId`           | `type` | Union of all cataloged model IDs                  |
| `ModelPricing`           | `type` | Per-token pricing rates in USD                    |
| `ModelCapabilities`      | `type` | Boolean capability flags (reasoning, tools, etc.) |
| `ModelModalities`        | `type` | Input/output modality descriptors                 |
| `ProviderRegistry`       | `type` | Function that resolves model ID to LanguageModel  |
| `ProviderRegistryConfig` | `type` | Configuration for `createProviderRegistry`        |
| `LanguageModel`          | `type` | AI SDK language model instance (v3)               |
| `TokenUsage`             | `type` | Token counts from a model invocation              |
| `UsageCost`              | `type` | Breakdown of cost in USD                          |

## Subpath Exports

Provider-specific subpath exports give access to filtered model lists and typed IDs:

| Import Path                     | Exports                                             |
| ------------------------------- | --------------------------------------------------- |
| `@funkai/models`                | Full API (catalog, provider, cost)                  |
| `@funkai/models/openai`         | `openAIModels`, `openAIModel()`, `OpenAIModelId`    |
| `@funkai/models/anthropic`      | `anthropicModels`, `anthropicModel()`, etc.         |
| `@funkai/models/google`         | `googleModels`, `googleModel()`, etc.               |
| `@funkai/models/google-vertex`  | `googleVertexModels`, `googleVertexModel()`, etc.   |
| `@funkai/models/mistral`        | `mistralModels`, `mistralModel()`, etc.             |
| `@funkai/models/amazon-bedrock` | `amazonBedrockModels`, `amazonBedrockModel()`, etc. |
| `@funkai/models/groq`           | `groqModels`, `groqModel()`, etc.                   |
| `@funkai/models/deepseek`       | `deepseekModels`, `deepseekModel()`, etc.           |
| `@funkai/models/xai`            | `xaiModels`, `xaiModel()`, etc.                     |
| `@funkai/models/cohere`         | `cohereModels`, `cohereModel()`, etc.               |
| `@funkai/models/fireworks-ai`   | `fireworksAIModels`, `fireworksAIModel()`, etc.     |
| `@funkai/models/togetherai`     | `togetheraiModels`, `togetheraiModel()`, etc.       |
| `@funkai/models/deepinfra`      | `deepinfraModels`, `deepinfraModel()`, etc.         |
| `@funkai/models/cerebras`       | `cerebrasModels`, `cerebrasModel()`, etc.           |
| `@funkai/models/perplexity`     | `perplexityModels`, `perplexityModel()`, etc.       |
| `@funkai/models/openrouter`     | `openRouterModels`, `openRouterModel()`, etc.       |
| `@funkai/models/llama`          | `llamaModels`, `llamaModel()`, etc.                 |
| `@funkai/models/alibaba`        | `alibabaModels`, `alibabaModel()`, etc.             |
| `@funkai/models/nvidia`         | `nvidiaModels`, `nvidiaModel()`, etc.               |
| `@funkai/models/huggingface`    | `huggingfaceModels`, `huggingfaceModel()`, etc.     |
| `@funkai/models/inception`      | `inceptionModels`, `inceptionModel()`, etc.         |

## References

- [Overview](/models)
- [Model Catalog](/models/catalog/overview)
- [Provider Resolution](/models/provider/overview)
- [Cost Calculation](/models/cost)
- [Troubleshooting](/models/troubleshooting)
