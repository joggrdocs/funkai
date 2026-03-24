# Prompts

The prompts system has two surfaces that work together:

- **CLI** (`@funkai/cli`) — build-time codegen. Reads `.prompt` files, validates them, and emits typed TypeScript modules.
- **Library** (`@funkai/prompts`) — runtime rendering. The generated code uses the library to render LiquidJS templates with Zod-validated variables.

## The .prompt file format

A `.prompt` file is a LiquidJS template with a YAML frontmatter block. The frontmatter declares the prompt's name, an optional group for nesting, and a variable schema.

```
---
name: code-reviewer
group: agents
schema:
  language:
    type: string
    description: Programming language being reviewed
  diff:
    type: string
    description: The code diff to review
  strict:
    type: boolean
    required: false
---

You are a {{ language }} code reviewer.

Review the following diff:

{{ diff }}
{% if strict %}Apply strict style enforcement.{% endif %}
```

The CLI compiles this into a TypeScript module with a typed `render(variables)` function and a Zod `schema`.

## Generating code

Run the CLI to compile `.prompt` files into TypeScript:

```bash
npx @funkai/cli prompts generate --includes "src/**/*.prompt" --out .prompts/client
```

Lint prompts for schema/template alignment without generating:

```bash
npx @funkai/cli prompts lint --includes "src/**/*.prompt"
```

## Using generated prompts

The CLI emits an `index.ts` that exports a `prompts` registry. Import it via the `~prompts` tsconfig alias (configured during setup):

```typescript
import { prompts } from "~prompts";

// Flat prompt (no group)
const text = prompts.greeting.render({ name: "Alice" });

// Grouped prompt (group: agents)
const review = prompts.agents.codeReviewer.render({
  language: "TypeScript",
  diff: "- const x = 1\n+ const x: number = 1",
});
```

`render()` validates variables against the Zod schema before rendering. A missing required variable throws at call time, not at model invocation.

## Runtime-only usage

If you want to use the library without codegen, create a registry manually with `createPromptRegistry()` from `@funkai/prompts`. This is uncommon — the CLI workflow is the standard path.

## References

- [`createPrompt()` reference](/reference/prompts/create-prompt)
- [`createPromptRegistry()` reference](/reference/prompts/create-prompt-registry)
- [Prompts CLI reference](/reference/prompts/cli)
