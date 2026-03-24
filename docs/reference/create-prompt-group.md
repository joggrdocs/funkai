# createPromptGroup()

Create a group of related prompt modules under a shared namespace. Groups are used by codegen to organize prompts into nested registry paths. Most users interact with groups through the generated registry rather than calling this function directly.

## Function Signature

```typescript
function createPromptGroup<T extends Record<string, PromptModule>>(name: string, prompts: T): T;
```

| Parameter | Type                                     | Description                                         |
| --------- | ---------------------------------------- | --------------------------------------------------- |
| `name`    | `string`                                 | Group name applied to each prompt (e.g. `'agents'`) |
| `prompts` | `T extends Record<string, PromptModule>` | Record of prompt modules to group                   |

**Returns:** A new record with the same keys, each module tagged with the group name.

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

// Create individual prompts
const systemPrompt = createPrompt({
  name: "system-prompt",
  template: "You are a {{ language }} code reviewer.",
  schema: z.object({ language: z.string() }),
});

const feedbackPrompt = createPrompt({
  name: "feedback",
  template: "Provide feedback on:\n\n{{ code }}",
  schema: z.object({ code: z.string() }),
});

// Group them under a namespace
const reviewer = createPromptGroup("agents/reviewer", {
  systemPrompt,
  feedback: feedbackPrompt,
});

// Assemble into a registry
const prompts = createPromptRegistry({
  agents: { reviewer },
});

// Access via nested path
prompts.agents.reviewer.systemPrompt.render({ language: "TypeScript" });
```

This function is primarily called by generated code. See [`createPromptRegistry()`](/reference/prompts/create-prompt-registry) for the consumer-facing API.
