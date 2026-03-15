# Set Up a Model Resolver

Configure `createModelResolver()` with multiple providers and an OpenRouter fallback.

## Prerequisites

- `@funkai/models` installed
- API keys for your providers (OpenAI, Anthropic, etc.)
- `OPENROUTER_API_KEY` set in the environment (for fallback)

## Steps

### 1. Install Provider SDKs

Install the AI SDK providers you want to use directly:

```bash
pnpm add @ai-sdk/openai @ai-sdk/anthropic
```

### 2. Create the Resolver

```ts
import { createModelResolver, openrouter } from "@funkai/models";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  },
  fallback: openrouter,
});
```

### 3. Resolve Models

```ts
const gpt = resolve("openai/gpt-4.1");
const claude = resolve("anthropic/claude-sonnet-4");
const mistral = resolve("mistral/mistral-large-latest");
```

- `"openai/gpt-4.1"` routes through `@ai-sdk/openai` directly
- `"anthropic/claude-sonnet-4"` routes through `@ai-sdk/anthropic` directly
- `"mistral/mistral-large-latest"` has no mapped provider, so it routes through OpenRouter

### 4. Use with Agents

Pass the resolver to `@funkai/agents` by resolving the model before creating the agent:

```ts
import { agent } from "@funkai/agents";

const summarizer = agent({
  name: "summarizer",
  model: resolve("openai/gpt-4.1"),
  prompt: ({ input }) => `Summarize:\n\n${input.text}`,
});
```

## Verification

Verify the resolver works by resolving each configured provider:

```ts
const gpt = resolve("openai/gpt-4.1");
const claude = resolve("anthropic/claude-sonnet-4");

console.log(gpt.modelId);
console.log(claude.modelId);
```

## Troubleshooting

### Cannot resolve model: no provider mapped

**Issue:** The model ID prefix does not match any key in `providers` and no `fallback` is configured.

**Fix:** Add the provider to the `providers` map or configure a `fallback`:

```ts
const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
  fallback: openrouter,
});
```

### OPENROUTER_API_KEY environment variable is required

**Issue:** Using `openrouter` as the fallback but `OPENROUTER_API_KEY` is not set.

**Fix:** Set the environment variable:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

## References

- [Provider Resolution](../provider/overview.md)
- [Configuration](../provider/configuration.md)
- [OpenRouter](../provider/openrouter.md)
