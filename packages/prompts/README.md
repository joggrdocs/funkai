<div align="center">
  <p><strong>@funkai/prompts</strong></p>
  <p>Prompt SDK for authoring <code>.prompt</code> files with LiquidJS templating and Zod validation.</p>

<a href="https://www.npmjs.com/package/@funkai/prompts"><img src="https://img.shields.io/npm/v/@funkai/prompts" alt="npm version" /></a>
<a href="https://github.com/joggrdocs/funkai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/joggrdocs/funkai" alt="License" /></a>

</div>

## Features

- :pencil2: **LiquidJS templating** — Write prompts as Liquid templates with YAML frontmatter.
- :shield: **Zod validation** — Schema variables are validated at render time.
- :package: **Codegen** — Generate typed TypeScript modules from `.prompt` files.
- :jigsaw: **Partials** — Reusable prompt fragments with `{% render %}` tags, flattened at build time.
- :file_folder: **Groups** — Organize prompts into nested namespaces via the `group` field.

## Install

```bash
npm install @funkai/prompts
```

## Usage

### Define a prompt

Create a `.prompt` file with YAML frontmatter and a Liquid template body:

```
---
name: writer
schema:
  tone: string
---
You are a {{ tone }} writer.
```

### Generate typed modules

```bash
npx funkai prompts generate --out .prompts/client --roots src/agents
```

### Consume prompts

Add the `~prompts` alias to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "~prompts": ["./.prompts/client/index.ts"]
    }
  }
}
```

Then import and use:

```ts
import { prompts } from "~prompts";

const instructions = prompts.agents.writer.render({ tone: "concise" });
```

### Frontmatter

| Field     | Required | Description                       |
| --------- | -------- | --------------------------------- |
| `name`    | Yes      | Unique kebab-case identifier      |
| `group`   | No       | Namespace path for grouping       |
| `version` | No       | Version number                    |
| `schema`  | No       | Variable declarations (see below) |

### Schema variables

Each key under `schema` declares a template variable:

| Field         | Default  | Description                             |
| ------------- | -------- | --------------------------------------- |
| `type`        | `string` | Variable type (only `string` supported) |
| `required`    | `true`   | Whether the variable must be provided   |
| `description` | —        | Human-readable description              |

Shorthand: `tone: string` is equivalent to `tone: { type: string, required: true }`.

### Partials

Use `{% render 'name', key: 'value' %}` to include shared partials. Partials resolve from:

1. **Custom partials** — `.prompts/partials/` in your project (takes precedence)
2. **Built-in partials** — SDK's bundled `identity`, `constraints`, `tools`

## Documentation

For comprehensive documentation, see [docs/overview.md](docs/overview.md).

## License

[MIT](../../LICENSE)
