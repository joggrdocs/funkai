# Provider Configuration

Configuration options for `createModelResolver()` and how to set up provider mappings.

## Key Concepts

### ModelResolverConfig

| Option      | Type                                 | Default     | Description                               |
| ----------- | ------------------------------------ | ----------- | ----------------------------------------- |
| `providers` | `ProviderMap`                        | `{}`        | Direct AI SDK provider mappings by prefix |
| `fallback`  | `(modelId: string) => LanguageModel` | `undefined` | Fallback factory for unmapped prefixes    |

Both fields are optional. A resolver with no configuration throws on every call.

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
const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    google: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY }),
  },
});
```

### Direct Providers with OpenRouter Fallback

Map preferred providers directly. Unmapped prefixes route through OpenRouter:

```ts
const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
  fallback: openrouter,
});
```

### OpenRouter-Only

Route all models through OpenRouter:

```ts
const resolve = createModelResolver({
  fallback: openrouter,
});
```

### Custom Fallback

Use any function as a fallback:

```ts
const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
  fallback: (modelId: string) => {
    const provider = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return provider(modelId);
  },
});
```

## Error Handling

`createModelResolver()` throws in these cases:

| Condition                    | Error Message                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Empty model ID               | `Cannot resolve model: model ID is empty`                                                   |
| No prefix, no fallback       | `Cannot resolve model "<id>": no provider prefix and no fallback configured`                |
| Unmapped prefix, no fallback | `Cannot resolve model "<id>": no provider mapped for "<prefix>" and no fallback configured` |

## References

- [Provider Resolution](overview.md)
- [OpenRouter](openrouter.md)
- [Setup Resolver Guide](../guides/setup-resolver.md)
