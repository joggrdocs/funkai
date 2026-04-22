# Provider Configuration

Configuration options for `createProviderRegistry()` and how to set up provider mappings.

## Key Concepts

### ProviderRegistryConfig

| Option      | Type          | Default | Description                               |
| ----------- | ------------- | ------- | ----------------------------------------- |
| `providers` | `ProviderMap` | `{}`    | Direct AI SDK provider mappings by prefix |

A registry with no providers throws on every call.

### ProviderMap

`ProviderMap` is `Readonly<Record<string, ProviderFactory>>`. Keys are provider prefixes that match the portion before `/` in a model ID.

```ts
const providers: ProviderMap = {
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
};
```

### ProviderFactory

`ProviderFactory` is `(modelName: string) => LanguageModel`. AI SDK provider constructors (`createOpenAI`, `createAnthropic`, etc.) return compatible factory functions.

## Configuration Patterns

### Direct Providers Only

Map each provider explicitly. Unmapped prefixes throw an error:

```ts
const resolve = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    google: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY }),
  },
});
```

### With OpenRouter

Include OpenRouter as a provider using `@openrouter/ai-sdk-provider`:

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    openrouter: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY }),
  },
});

const lm = registry("openrouter/anthropic/claude-sonnet-4-20250514");
```

## Error Handling

`createProviderRegistry()` throws in these cases:

| Condition       | Error Message                                                    |
| --------------- | ---------------------------------------------------------------- |
| Empty model ID  | `Cannot resolve model: model ID is empty`                        |
| No prefix       | `Invalid model ID "<id>": expected "provider/model" format (e.g. "openai/gpt-4.1")` |
| Unmapped prefix | `Cannot resolve model "<id>": no provider mapped for "<prefix>"` |

## References

- [Provider Resolution](overview.md)
- [OpenRouter](openrouter.md)
- [Setup Resolver Guide](../guides/setup-resolver.md)
