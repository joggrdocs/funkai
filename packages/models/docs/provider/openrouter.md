# OpenRouter Integration

OpenRouter acts as a model aggregator, routing requests to the underlying provider. `@funkai/models` provides two exports for OpenRouter integration: `openrouter` (cached singleton) and `createOpenRouter` (factory).

## Key Concepts

### API Key Resolution

Both `openrouter` and `createOpenRouter` resolve the API key in this order:

1. Explicit `apiKey` in options (for `createOpenRouter`)
2. `OPENROUTER_API_KEY` environment variable

If neither is set, an error is thrown at call time.

### Cached Provider

The `openrouter` export is a cached resolver. The underlying provider instance is created once and reused across calls. If `OPENROUTER_API_KEY` changes at runtime, the cache invalidates and a new provider is created.

```ts
const lm = openrouter("openai/gpt-4.1");
```

### Provider Factory

`createOpenRouter` creates a new `OpenRouterProvider` instance. Use this when you need multiple providers with different configurations:

```ts
const provider = createOpenRouter({ apiKey: "sk-..." });
const lm = provider("openai/gpt-4.1");
```

## Usage

### As a Fallback

The most common pattern is using `openrouter` as the fallback for `createModelResolver()`:

```ts
const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
  fallback: openrouter,
});
```

Models with an `"openai"` prefix route directly. All other prefixes route through OpenRouter.

### As the Only Provider

```ts
const resolve = createModelResolver({
  fallback: openrouter,
});

const lm = resolve("anthropic/claude-sonnet-4");
```

### Direct Usage

Use `openrouter` directly without a resolver:

```ts
const lm = openrouter("openai/gpt-4.1");
```

### Custom Instance

```ts
const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const lm = provider("mistral/mistral-large-latest");
```

## Configuration

`createOpenRouter` accepts all options from `@openrouter/ai-sdk-provider`:

| Option   | Type     | Default                          | Description        |
| -------- | -------- | -------------------------------- | ------------------ |
| `apiKey` | `string` | `process.env.OPENROUTER_API_KEY` | OpenRouter API key |

Additional options are forwarded directly to the underlying `@openrouter/ai-sdk-provider`.

## Environment Variables

| Variable             | Required | Description        |
| -------------------- | -------- | ------------------ |
| `OPENROUTER_API_KEY` | Yes      | OpenRouter API key |

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [@openrouter/ai-sdk-provider](https://www.npmjs.com/package/@openrouter/ai-sdk-provider)

## References

- [Provider Resolution](overview.md)
- [Configuration](configuration.md)
- [Setup Resolver Guide](../guides/setup-resolver.md)
