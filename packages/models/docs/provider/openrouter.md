# OpenRouter Integration

OpenRouter acts as a model aggregator, routing requests to the underlying provider. Use the `@openrouter/ai-sdk-provider` package directly to create an OpenRouter provider instance.

## Key Concepts

### API Key Resolution

`createOpenRouter` from `@openrouter/ai-sdk-provider` resolves the API key in this order:

1. Explicit `apiKey` in options
2. `OPENROUTER_API_KEY` environment variable

If neither is set, an error is thrown at call time.

### Provider Factory

`createOpenRouter` from `@openrouter/ai-sdk-provider` creates a provider instance:

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const lm = openrouter("openai/gpt-4.1");
```

## Usage

### As a Provider in the Registry

The most common pattern is registering OpenRouter as a provider in `createProviderRegistry()`:

```ts
import { createProviderRegistry } from "@funkai/models";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    openrouter: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY }),
  },
});
```

Models with an `"openai"` prefix route through `@ai-sdk/openai`. Models with an `"openrouter"` prefix route through OpenRouter.

### Direct Usage

Use `createOpenRouter` directly without a registry:

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const lm = openrouter("openai/gpt-4.1");
```

## Configuration

`createOpenRouter` from `@openrouter/ai-sdk-provider` accepts:

| Option   | Type     | Default                          | Description        |
| -------- | -------- | -------------------------------- | ------------------ |
| `apiKey` | `string` | `process.env.OPENROUTER_API_KEY` | OpenRouter API key |

Additional options are forwarded directly to the underlying `@openrouter/ai-sdk-provider`.

## Environment Variables

| Variable             | Required | Description        |
| -------------------- | -------- | ------------------ |
| `OPENROUTER_API_KEY` | No\*     | OpenRouter API key |

\*Required when `apiKey` is not provided to `createOpenRouter(...)`.

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [@openrouter/ai-sdk-provider](https://www.npmjs.com/package/@openrouter/ai-sdk-provider)

## References

- [Provider Resolution](overview.md)
- [Configuration](configuration.md)
- [Setup Resolver Guide](../guides/setup-resolver.md)
