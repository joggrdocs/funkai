<p align="center">
  <img src="./banner.svg" alt="Prompts SDK" width="100%" />
</p>

# @pkg/prompts-sdk

Prompt SDK for authoring `.prompt` files with LiquidJS templating and Zod validation. The CLI generates typed TypeScript modules from `.prompt` sources so prompts are statically typed and validated at build time.

## Install

```bash
pnpm add @pkg/prompts-sdk --workspace
```

## `.prompt` File Format

A `.prompt` file is a Liquid template with YAML frontmatter:

```
---
name: coverage-assessor
group: agents/coverage-assessor
schema:
  scope:
    type: string
    description: Assessment scope
  target:
    type: string
    required: false
---

You are a coverage assessor for {{ scope }}.
{% if target %}Targeting {{ target }} docs.{% endif %}
```

| Field     | Required | Description                       |
| --------- | -------- | --------------------------------- |
| `name`    | Yes      | Unique kebab-case identifier      |
| `group`   | No       | Namespace path for grouping       |
| `version` | No       | Version number                    |
| `schema`  | No       | Variable declarations (see below) |

### Schema Variables

Each key under `schema` declares a template variable:

| Field         | Default  | Description                             |
| ------------- | -------- | --------------------------------------- |
| `type`        | `string` | Variable type (only `string` supported) |
| `required`    | `true`   | Whether the variable must be provided   |
| `description` | —        | Human-readable description              |

Shorthand: `scope: string` is equivalent to `scope: { type: string, required: true }`.

### Partials

Use `{% render 'name', key: 'value' %}` to include shared partials. Partials are resolved from two locations (in order):

1. **Custom partials** — `.prompts/partials/` in your project (takes precedence)
2. **Built-in partials** — SDK's `src/prompts/` directory

All partials are flattened at codegen time — the generated output contains no render tags.

Built-in partials: `identity`, `constraints`, `tools`.

## `.prompts` Directory

The `.prompts` directory is your prompt workspace:

```
.prompts/
├── 📁 client/           # Generated (gitignored)
│   ├── 📄 index.ts
│   ├── 📄 chat-assistant.ts
│   └── 📄 coverage-assessor.ts
└── 📁 partials/         # Custom partials (committed)
    └── 📄 my-partial.prompt
```

| Subdirectory | Gitignored | Purpose                      |
| ------------ | ---------- | ---------------------------- |
| `client/`    | Yes        | Generated TypeScript modules |
| `partials/`  | No         | Custom reusable partials     |

## CLI

The CLI has been extracted to [`@funkai/cli`](../cli/README.md). Install it for the `prompts` binary:

```bash
pnpm add @funkai/cli --workspace
```

## Usage

### Consuming Prompts

Add the `~prompts` alias to your `tsconfig.json` (or run `prompts setup`):

```json
{
  "compilerOptions": {
    "paths": {
      "~prompts": ["./.prompts/client/index.ts"]
    }
  }
}
```

Import and use:

```typescript
import { prompts } from '~prompts'

// Render a prompt (validates variables via Zod)
const instructions = prompts.agents.coverageAssessor.coverageAssessor.render({ scope: 'full' })

// Access the schema
const schema = prompts.agents.coverageAssessor.coverageAssessor.schema

// Validate without rendering
const vars = prompts.agents.coverageAssessor.coverageAssessor.validate({ scope: 'full' })
```

### Nesting with Groups

Prompts are organized by their `group` field. Each `/`-separated segment becomes a nesting level, with all names converted to camelCase:

```typescript
import { prompts } from '~prompts'

// No group — top-level access
prompts.greeting.render()

// group: agents
prompts.agents.coverageAssessor.render({ scope: 'full' })

// group: agents/specialized
prompts.agents.specialized.deepAnalyzer.render({ target: 'api' })
```

### Types

The generated registry exports a `prompts` const object. Use `typeof prompts` for type-level access:

```typescript
import { prompts } from '~prompts'

type AllPrompts = typeof prompts
```

Prompts with no schema variables accept `render()` with no arguments.

### Package Script

Add to your `package.json`:

```json
{
  "scripts": {
    "prompts:generate": "prompts generate --out .prompts/client --roots prompts src/agents src/workflows"
  }
}
```

## Documentation

For comprehensive documentation, see [docs/overview.md](docs/overview.md).
