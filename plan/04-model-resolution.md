# 04 — Pluggable Model Resolution

## Problem

Today, `resolveModel()` in `src/core/agent/utils.ts` hardcodes OpenRouter:

```typescript
export function resolveModel(ref: Model): LanguageModel {
  if (typeof ref === "string") {
    return openrouter(ref); // hardcoded
  }
  return ref as LanguageModel;
}
```

This means `@funkai/agents` has a hard dependency on `@openrouter/ai-sdk-provider`.
Users who want `@ai-sdk/anthropic` or `@ai-sdk/openai` still pull in OpenRouter.

## Solution: Configurable resolver

### Global configuration

```typescript
// config.ts — new file in @funkai/agents
import type { LanguageModel } from "ai";

type ModelResolver = (id: string) => LanguageModel;

let _resolver: ModelResolver | undefined;

export function configure(options: { resolveModel: ModelResolver }): void {
  _resolver = options.resolveModel;
}

export function getModelResolver(): ModelResolver | undefined {
  return _resolver;
}
```

### Updated resolveModel

```typescript
// agent/utils.ts
import { getModelResolver } from "@/core/config.js";

export function resolveModel(ref: Model): LanguageModel {
  if (typeof ref === "string") {
    const resolver = getModelResolver();
    if (!resolver) {
      throw new Error(
        `String model ID "${ref}" requires a model resolver. ` +
          "Either pass a LanguageModel instance directly, or call " +
          "configure({ resolveModel: ... }) first.\n\n" +
          "Example with OpenRouter:\n" +
          '  import { configure } from "@funkai/agents"\n' +
          '  import { openrouter } from "@funkai/openrouter"\n' +
          "  configure({ resolveModel: openrouter })\n\n" +
          "Example with OpenAI:\n" +
          '  import { configure } from "@funkai/agents"\n' +
          '  import { openai } from "@ai-sdk/openai"\n' +
          "  configure({ resolveModel: (id) => openai(id) })",
      );
    }
    return resolver(ref);
  }
  return ref as LanguageModel;
}
```

### Consumer usage

```typescript
// Option 1: Configure once at app startup
import { configure, agent } from "@funkai/agents";
import { openrouter } from "@funkai/openrouter";

configure({ resolveModel: openrouter });

const a = agent({
  name: "helper",
  model: "openai/gpt-4.1", // string ID works via configured resolver
  system: "You are helpful.",
});

// Option 2: Pass LanguageModel directly (no config needed)
import { agent } from "@funkai/agents";
import { anthropic } from "@ai-sdk/anthropic";

const a = agent({
  name: "helper",
  model: anthropic("claude-sonnet-4-5-20250929"), // always works
  system: "You are helpful.",
});

// Option 3: Custom resolver
import { configure, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

configure({
  resolveModel: (id) => openai(id),
});

const a = agent({
  name: "helper",
  model: "gpt-4.1", // resolved by custom function
  system: "You are helpful.",
});
```

### Per-agent override (optional, future consideration)

If needed, agents could accept `resolveModel` in their config to override
the global resolver. This is not required for the initial implementation.

```typescript
const a = agent({
  name: "helper",
  model: "gpt-4.1",
  resolveModel: (id) => openai(id), // override global
  system: "You are helpful.",
});
```

## `@funkai/openrouter` convenience

The `openrouter` function already has the right signature — it takes a
string model ID and returns a `LanguageModel`. So setup is one line:

```typescript
import { configure } from "@funkai/agents";
import { openrouter } from "@funkai/openrouter";
configure({ resolveModel: openrouter });
```

## Impact

- `@funkai/agents` drops `@openrouter/ai-sdk-provider` from its dependencies
- The `Model` type stays `string | LanguageModel` — no breaking change to the type
- Users who pass `LanguageModel` instances directly see zero change
- Users who pass string IDs need to call `configure()` once (or use `funkai` root package which auto-configures)

## Auto-configuration in root package

The `funkai` root meta-package auto-configures OpenRouter as the default
resolver on import:

```typescript
// funkai/src/index.ts
import { configure } from "@funkai/agents";
import { openrouter } from "@funkai/openrouter";

configure({ resolveModel: openrouter });

export * from "@funkai/agents";
export * from "@funkai/models";
export * from "@funkai/openrouter";
export * from "@funkai/prompts";
```

This means `funkai` users get the current behavior with zero config changes.
