# createProviderRegistry()

Create a provider registry that maps string prefixes to AI SDK provider instances. The returned function resolves `"provider/model"` strings into `LanguageModel` instances suitable for passing to `agent()`.

## Function Signature

```typescript
function createProviderRegistry(config: ProviderRegistryConfig): ProviderRegistry;
```

## ProviderRegistryConfig

```typescript
interface ProviderRegistryConfig {
  readonly providers: AIProviders;
}
```

| Field       | Type          | Required | Description                                                 |
| ----------- | ------------- | -------- | ----------------------------------------------------------- |
| `providers` | `AIProviders` | Yes      | Map of provider prefix strings to AI SDK provider instances |

`AIProviders` is the parameter type accepted by the AI SDK's `createProviderRegistry`. Each key is a prefix string used to route model IDs.

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createProviderRegistry } from "@funkai/models";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic,
  },
});
```

## ProviderRegistry Type

```typescript
type ProviderRegistry = (modelId: ModelId) => LanguageModel;
```

`ProviderRegistry` is a plain function. Call it with a `provider/model` string to receive a `LanguageModel` instance.

```typescript
const gpt41 = registry("openai/gpt-4.1");
const claude = registry("anthropic/claude-sonnet-4");
```

## Resolution Algorithm

1. The `modelId` string is validated — must be non-empty and contain `/`.
2. The prefix before the first `/` is extracted (e.g. `"openai"` from `"openai/gpt-4.1"`).
3. The prefix is looked up in the `providers` map.
4. The AI SDK's internal registry resolves the provider prefix + model suffix to a `LanguageModel` using `/` as the separator.
5. Throws `Error` if the model ID is empty, missing a `/`, or the provider is not registered.

```typescript
// Throws: Invalid model ID "gpt-4.1": expected "provider/model" format
registry("gpt-4.1");

// Throws: Cannot resolve model: model ID is empty
registry("");

// Throws: Failed to resolve model "unknown/gpt-4.1": ...
registry("unknown/gpt-4.1");
```

## OpenRouter Fallback Pattern

A common pattern is to register a single OpenRouter provider that can resolve any `openrouter/...` model ID, providing a fallback when a specific provider is not configured.

```typescript
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "@funkai/models";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    openrouter: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY }),
  },
});

// Direct provider
const m1 = registry("openai/gpt-4.1");

// Via OpenRouter
const m2 = registry("openrouter/anthropic/claude-sonnet-4");
```

## LanguageModel Type

```typescript
// Narrowed to AI SDK v3 specification only
type LanguageModel = Extract<BaseLanguageModel, { specificationVersion: "v3" }>;
```

`LanguageModel` is the concrete v3 model object from the AI SDK. It is the required type for `AgentConfig.model` in `@funkai/agents`. Provider functions like `openai('gpt-4.1')` return this type. Middleware-wrapped models via `wrapLanguageModel()` also satisfy this type.

`LanguageModel` is exported from both `@funkai/models` and `@funkai/agents`:

```typescript
import type { LanguageModel } from "@funkai/models";
import type { LanguageModel } from "@funkai/agents";
```

Both refer to the same underlying AI SDK v3 type.

## TokenUsage

```typescript
interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly reasoningTokens: number;
}
```

All fields are resolved `number` values — `0` when the provider does not report a given field. Exported from both `@funkai/models` and `@funkai/agents`.

## See Also

- [Models concept](/concepts/models) — overview with usage examples
- [`model()` reference](/reference/models/model) — look up model definitions
- [`calculateCost()` reference](/reference/models/calculate-cost) — compute cost from usage and pricing
