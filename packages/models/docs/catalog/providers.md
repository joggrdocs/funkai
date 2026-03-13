# Supported Providers

The model catalog includes models from 21 providers. Each provider has a dedicated subpath export and a prefix used in model IDs.

## Provider List

| Provider       | Prefix           | Subpath Import                  |
| -------------- | ---------------- | ------------------------------- |
| OpenAI         | `openai`         | `@funkai/models/openai`         |
| Anthropic      | `anthropic`      | `@funkai/models/anthropic`      |
| Google         | `google`         | `@funkai/models/google`         |
| Google Vertex  | `google-vertex`  | `@funkai/models/google-vertex`  |
| Mistral        | `mistral`        | `@funkai/models/mistral`        |
| Amazon Bedrock | `amazon-bedrock` | `@funkai/models/amazon-bedrock` |
| Groq           | `groq`           | `@funkai/models/groq`           |
| DeepSeek       | `deepseek`       | `@funkai/models/deepseek`       |
| xAI            | `xai`            | `@funkai/models/xai`            |
| Cohere         | `cohere`         | `@funkai/models/cohere`         |
| Fireworks AI   | `fireworks-ai`   | `@funkai/models/fireworks-ai`   |
| Together AI    | `togetherai`     | `@funkai/models/togetherai`     |
| DeepInfra      | `deepinfra`      | `@funkai/models/deepinfra`      |
| Cerebras       | `cerebras`       | `@funkai/models/cerebras`       |
| Perplexity     | `perplexity`     | `@funkai/models/perplexity`     |
| OpenRouter     | `openrouter`     | `@funkai/models/openrouter`     |
| Llama          | `llama`          | `@funkai/models/llama`          |
| Alibaba        | `alibaba`        | `@funkai/models/alibaba`        |
| NVIDIA         | `nvidia`         | `@funkai/models/nvidia`         |
| Hugging Face   | `huggingface`    | `@funkai/models/huggingface`    |
| Inception      | `inception`      | `@funkai/models/inception`      |

## Subpath Export API

Each provider subpath exports three members following a consistent naming pattern:

| Export              | Type       | Description                                      |
| ------------------- | ---------- | ------------------------------------------------ |
| `<provider>Models`  | `const`    | Readonly array of `ModelDefinition` for provider |
| `<provider>Model`   | `function` | Look up a model by ID, returns `null` if missing |
| `<Provider>ModelId` | `type`     | Union type of known model IDs for the provider   |

### Example

```ts
import { anthropicModels, anthropicModel } from "@funkai/models/anthropic";
import type { AnthropicModelId } from "@funkai/models/anthropic";

const id: AnthropicModelId = "claude-sonnet-4-20250514";

const m = anthropicModel(id);
if (m) {
  console.log(m.name, m.pricing.input);
}

const withReasoning = anthropicModels.filter((m) => m.capabilities.reasoning);
```

## Model ID Format

Model IDs in the catalog use the format `<provider-native-id>` (e.g. `"gpt-4.1"`, `"claude-sonnet-4-20250514"`). When used with `createModelResolver()`, prefix them with the provider slug: `"openai/gpt-4.1"`, `"anthropic/claude-sonnet-4-20250514"`.

## Data Source

All provider data is auto-generated from [models.dev](https://models.dev) via the `generate:models` script. To update:

```bash
pnpm --filter=@funkai/models generate:models
```

## References

- [Model Catalog](overview.md)
- [Filtering](filtering.md)
- [Provider Resolution](../provider/overview.md)
