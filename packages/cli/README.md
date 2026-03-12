# @funkai/cli

CLI for the funkai prompt SDK — codegen, lint, create, and setup commands for `.prompt` files.

Built on [kidd-cli](https://github.com/joggrdocs/kidd).

## Install

```bash
pnpm add @funkai/cli --workspace
```

## Commands

### `prompts generate`

Generate typed TypeScript modules from `.prompt` files.

```bash
prompts generate --out .prompts/client --roots prompts src/agents src/workflows
```

| Flag         | Description                                         |
| ------------ | --------------------------------------------------- |
| `--out`      | Output directory for generated files                |
| `--roots`    | Directories to scan recursively for `.prompt` files |
| `--partials` | Custom partials directory                           |
| `--silent`   | Suppress output except errors                       |

Custom partials are auto-discovered from the sibling `partials/` directory (relative to `--out`).

Runs lint validation automatically. Exits with code 1 on lint errors.

### `prompts lint`

Validate `.prompt` files without generating output.

```bash
prompts lint --roots prompts src/agents
```

| Flag         | Description                                              |
| ------------ | -------------------------------------------------------- |
| `--roots`    | Directories to scan                                      |
| `--partials` | Custom partials directory (default: `.prompts/partials`) |
| `--silent`   | Suppress output except errors                            |

Reports:

- **Error** — template variable not declared in schema (undefined var)
- **Warn** — schema variable not used in template (unused var)

### `prompts create`

Scaffold a new `.prompt` file.

```bash
prompts create my-agent
prompts create my-agent --out src/agents/my-agent
```

| Flag        | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| `--name`    | Prompt name (kebab-case)                                      |
| `--out`     | Output directory (defaults to cwd)                            |
| `--partial` | Create as a partial in `.prompts/partials/` (ignores `--out`) |

### `prompts setup`

Interactive project configuration for `.prompt` file development.

```bash
prompts setup
```

Configures:

1. VSCode file association (`*.prompt` → Markdown)
2. VSCode Liquid extension recommendation
3. `.gitignore` entry for generated `.prompts/client/` directory
4. `tsconfig.json` path alias (`~prompts` → `./.prompts/client/index.ts`)

## Package Script

Add to your `package.json`:

```json
{
  "scripts": {
    "prompts:generate": "prompts generate --out .prompts/client --roots prompts src/agents src/workflows"
  }
}
```

## Documentation

See the [Prompts SDK docs](../prompts/docs/overview.md) for the full file format, library API, and guides.
