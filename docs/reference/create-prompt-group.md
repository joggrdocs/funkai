# createPromptGroup()

Create a group of related prompt modules under a shared namespace. Groups are used by codegen to organize prompts into nested registry paths. Most users interact with groups through the generated registry rather than calling this function directly.

## Function Signature

```typescript
function createPromptGroup(config: unknown): unknown;
```

## How Groups Work

Groups correspond to the `group` field in `.prompt` file frontmatter. Each `/`-separated segment becomes a nesting level in the registry, with names converted to camelCase.

```yaml
# In a .prompt file
---
name: system-prompt
group: agents/coverage-assessor
---
```

The codegen output registers this prompt at the path `prompts.agents.coverageAssessor.systemPrompt`.

## Usage

```typescript
import { createPrompt, createPromptGroup, createPromptRegistry } from "@funkai/prompts";
import { z } from "zod";

// Create individual prompts with a group
const systemPrompt = createPrompt({
  name: "system-prompt",
  group: "agents/reviewer",
  template: "You are a {{ language }} code reviewer.",
  schema: z.object({ language: z.string() }),
});

const feedbackPrompt = createPrompt({
  name: "feedback",
  group: "agents/reviewer",
  template: "Provide feedback on:\n\n{{ code }}",
  schema: z.object({ code: z.string() }),
});

// Groups are assembled into a registry
const prompts = createPromptRegistry({
  agents: {
    reviewer: { systemPrompt, feedback: feedbackPrompt },
  },
});

// Access via nested path
prompts.agents.reviewer.systemPrompt.render({ language: "TypeScript" });
```

This function is primarily called by generated code. See [`createPromptRegistry()`](/reference/prompts/create-prompt-registry) for the consumer-facing API.
