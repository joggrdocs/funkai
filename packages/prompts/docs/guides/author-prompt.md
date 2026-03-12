# Author a Prompt

## Prerequisites

- `@pkg/prompts-sdk` installed
- Project configured ([Setup guide](setup-project.md))

## Steps

1. Scaffold with the CLI:

```bash
prompts create my-agent --out src/agents/my-agent
```

2. Edit the frontmatter — set `name`, `group`, and `schema` variables.

3. Write the template body using `{{ var }}` syntax and conditionals.

4. Add partials if needed:

```liquid
{% render 'identity', role: 'Analyzer', desc: 'a code analyzer' %}
```

5. Lint:

```bash
prompts lint --roots src/agents
```

6. Generate:

```bash
prompts generate --out .prompts/client --roots src/agents
```

7. Import and use:

```ts
import { prompts } from "~prompts";

const text = prompts.myAgent.render({ scope: "full" });
```

## Verification

- `prompts lint` reports no errors
- Generated file exists at `.prompts/client/my-agent.ts`
- TypeScript compiles without errors

## Troubleshooting

### Undefined variable error

**Fix:** Add the variable to the frontmatter `schema` block.

### Duplicate prompt name

**Fix:** Two `.prompt` files share the same `name` — rename one to a unique kebab-case identifier.

### TypeScript can't find `~prompts`

**Fix:** Run `prompts setup` or add the path alias to `tsconfig.json`.

## References

- [File Format](../file-format/overview.md)
- [CLI Commands](../cli/commands.md)
- [Partials](../file-format/partials.md)
