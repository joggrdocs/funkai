# Set Up a Provider Registry

Configure `createProviderRegistry()` with multiple providers.

## Prerequisites

- `@funkai/models` installed
- API keys for your providers (OpenAI, Anthropic, etc.)

## Steps

### 1. Install Provider SDKs

Install the AI SDK providers you want to use directly:

```bash
pnpm add @ai-sdk/openai @ai-sdk/anthropic
```

### 2. Create the Registry

```ts
import { createProviderRegistry } from "@funkai/models";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  },
});
```

### 3. Resolve Models

```ts
const gpt = registry("openai/gpt-4.1");
const claude = registry("anthropic/claude-sonnet-4");
```

- `"openai/gpt-4.1"` routes through `@ai-sdk/openai` directly
- `"anthropic/claude-sonnet-4"` routes through `@ai-sdk/anthropic` directly

### 4. Use with Agents

Pass the registry to `@funkai/agents` by resolving the model before creating the agent:

```ts
import { agent } from "@funkai/agents";

const summarizer = agent({
  name: "summarizer",
  model: registry("openai/gpt-4.1"),
  prompt: ({ input }) => `Summarize:\n\n${input.text}`,
});
```

## Verification

Verify the registry works by resolving each configured provider:

```ts
const gpt = registry("openai/gpt-4.1");
const claude = registry("anthropic/claude-sonnet-4");

console.log(gpt.modelId);
console.log(claude.modelId);
```

## Troubleshooting

### Cannot resolve model: no provider mapped

**Issue:** The model ID prefix does not match any key in `providers`.

**Fix:** Add the provider to the `providers` map:

```ts
const registry = createProviderRegistry({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
});
```

## References

- [Provider Resolution](../provider/overview.md)
- [Configuration](../provider/configuration.md)
- [OpenRouter](../provider/openrouter.md)
