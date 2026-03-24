# model()

Look up a single model definition from the catalog by its identifier. Returns the full `ModelDefinition` including pricing, capabilities, and modalities, or `null` when the ID is not found.

## Function Signature

```typescript
function model(id: ModelId): ModelDefinition | null;
```

| Parameter | Type      | Description                                                              |
| --------- | --------- | ------------------------------------------------------------------------ |
| `id`      | `ModelId` | Provider-native model identifier (e.g. `"gpt-4.1"`, `"claude-sonnet-4"`) |

**Returns:** `ModelDefinition | null`

## ModelId

```typescript
type KnownModelId = "gpt-4.1" | "claude-sonnet-4" | /* ... */;
type ModelId = LiteralUnion<KnownModelId, string>;
```

`ModelId` provides IDE autocomplete for cataloged models while accepting arbitrary strings for custom or newly released models.

## ModelDefinition

```typescript
interface ModelDefinition {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly family: string;
  readonly pricing: ModelPricing;
  readonly contextWindow: number;
  readonly maxOutput: number;
  readonly modalities: ModelModalities;
  readonly capabilities: ModelCapabilities;
}
```

| Field           | Type                | Description                                    |
| --------------- | ------------------- | ---------------------------------------------- |
| `id`            | `string`            | Provider-native identifier (e.g. `"gpt-4.1"`)  |
| `name`          | `string`            | Human-readable display name                    |
| `provider`      | `string`            | Provider slug (e.g. `"openai"`, `"anthropic"`) |
| `family`        | `string`            | Model family (e.g. `"gpt"`, `"claude-sonnet"`) |
| `pricing`       | `ModelPricing`      | Per-token pricing rates                        |
| `contextWindow` | `number`            | Maximum context window in tokens               |
| `maxOutput`     | `number`            | Maximum output tokens                          |
| `modalities`    | `ModelModalities`   | Accepted input/output modalities               |
| `capabilities`  | `ModelCapabilities` | Boolean capability flags                       |

## ModelPricing

```typescript
interface ModelPricing {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
  readonly cacheWrite?: number;
  readonly reasoning?: number;
}
```

All rates are per-token in USD. Optional fields are absent when the provider does not support that billing dimension.

## ModelCapabilities

```typescript
interface ModelCapabilities {
  readonly reasoning: boolean;
  readonly toolCall: boolean;
  readonly attachment: boolean;
  readonly structuredOutput: boolean;
}
```

## ModelModalities

```typescript
interface ModelModalities {
  readonly input: readonly string[];
  readonly output: readonly string[];
}
```

Values: `"text"`, `"image"`, `"audio"`, `"video"`, `"pdf"`.

## Provider Subpath Exports

Each provider has a dedicated subpath export with typed model IDs and per-provider lookup functions.

| Subpath                         | Exports                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `@funkai/models/openai`         | `OpenAIModelId`, `openAIModels`, `openAIModel(id)`                      |
| `@funkai/models/anthropic`      | `AnthropicModelId`, `anthropicModels`, `anthropicModel(id)`             |
| `@funkai/models/google`         | `GoogleModelId`, `googleModels`, `googleModel(id)`                      |
| `@funkai/models/google-vertex`  | `GoogleVertexModelId`, `googleVertexModels`, `googleVertexModel(id)`    |
| `@funkai/models/mistral`        | `MistralModelId`, `mistralModels`, `mistralModel(id)`                   |
| `@funkai/models/amazon-bedrock` | `AmazonBedrockModelId`, `amazonBedrockModels`, `amazonBedrockModel(id)` |
| `@funkai/models/groq`           | `GroqModelId`, `groqModels`, `groqModel(id)`                            |
| `@funkai/models/deepseek`       | `DeepSeekModelId`, `deepSeekModels`, `deepSeekModel(id)`                |
| `@funkai/models/xai`            | `XAIModelId`, `xAIModels`, `xAIModel(id)`                               |
| `@funkai/models/cohere`         | `CohereModelId`, `cohereModels`, `cohereModel(id)`                      |
| `@funkai/models/fireworks-ai`   | `FireworksAIModelId`, `fireworksAIModels`, `fireworksAIModel(id)`       |
| `@funkai/models/togetherai`     | `TogetherAIModelId`, `togetherAIModels`, `togetherAIModel(id)`          |
| `@funkai/models/deepinfra`      | `DeepInfraModelId`, `deepInfraModels`, `deepInfraModel(id)`             |
| `@funkai/models/cerebras`       | `CerebrasModelId`, `cerebrasModels`, `cerebrasModel(id)`                |
| `@funkai/models/perplexity`     | `PerplexityModelId`, `perplexityModels`, `perplexityModel(id)`          |
| `@funkai/models/openrouter`     | `OpenRouterModelId`, `openRouterModels`, `openRouterModel(id)`          |
| `@funkai/models/llama`          | `LlamaModelId`, `llamaModels`, `llamaModel(id)`                         |
| `@funkai/models/alibaba`        | `AlibabaModelId`, `alibabaModels`, `alibabaModel(id)`                   |
| `@funkai/models/nvidia`         | `NvidiaModelId`, `nvidiaModels`, `nvidiaModel(id)`                      |
| `@funkai/models/huggingface`    | `HuggingFaceModelId`, `huggingFaceModels`, `huggingFaceModel(id)`       |
| `@funkai/models/inception`      | `InceptionModelId`, `inceptionModels`, `inceptionModel(id)`             |

## See Also

- [Models concept](/concepts/models) — overview with usage examples
- [`models()` reference](/reference/models/models) — filter and query the full catalog
- [`createProviderRegistry()` reference](/reference/models/provider-registry) — resolve model IDs to providers
- [`calculateCost()` reference](/reference/models/calculate-cost) — compute cost from usage
