# CLI

The `prompts` CLI discovers, validates, and generates typed TypeScript from `.prompt` files.

## Installation

Available as the `prompts` binary from `@funkai/cli`. Install it as a workspace dependency:

```bash
pnpm add @funkai/cli --workspace
```

## Workflow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#313244',
    'primaryTextColor': '#cdd6f4',
    'primaryBorderColor': '#6c7086',
    'lineColor': '#89b4fa',
    'secondaryColor': '#45475a',
    'tertiaryColor': '#1e1e2e',
    'actorBkg': '#313244',
    'actorBorder': '#89b4fa',
    'actorTextColor': '#cdd6f4',
    'signalColor': '#cdd6f4',
    'signalTextColor': '#cdd6f4'
  }
}}%%
sequenceDiagram
    participant Dev as Developer
    participant CLI as prompts CLI
    participant FS as File System

    Dev->>CLI: prompts generate
    CLI->>FS: Discover .prompt files from --includes globs
    CLI->>CLI: Parse frontmatter + extract variables
    CLI->>CLI: Lint (schema vs template match)
    CLI->>CLI: Flatten partials
    CLI->>FS: Write generated .ts modules
    FS-->>Dev: Import typed prompts from ~prompts
```

## Commands Reference

### `prompts generate`

Generate typed TypeScript modules from `.prompt` files.

**Alias:** `gen`

| Flag         | Alias | Required | Description                               |
| ------------ | ----- | -------- | ----------------------------------------- |
| `--out`      | `-o`  | Yes      | Output directory for generated files      |
| `--includes` | `-r`  | Yes      | Glob patterns to scan for `.prompt` files |
| `--silent`   | ---   | No       | Suppress output except errors             |

```bash
prompts generate --out .prompts/client --includes "prompts/**" "src/agents/**" "src/workflows/**"
```

Custom partials are auto-discovered from the sibling `partials/` directory (relative to `--out`).

Runs lint validation automatically before generating. Exits with code 1 on lint errors.

### `prompts lint`

Validate `.prompt` files without generating output.

| Flag         | Alias | Required | Description                                              |
| ------------ | ----- | -------- | -------------------------------------------------------- |
| `--includes` | `-r`  | Yes      | Glob patterns to scan for `.prompt` files                |
| `--partials` | `-p`  | No       | Custom partials directory (default: `.prompts/partials`) |
| `--silent`   | ---   | No       | Suppress output except errors                            |

**Diagnostics:**

| Level | Meaning                                  |
| ----- | ---------------------------------------- |
| Error | Template variable not declared in schema |
| Warn  | Schema variable not used in template     |

```bash
prompts lint --includes "prompts/**" "src/agents/**"
```

### `prompts create`

Scaffold a new `.prompt` file.

| Arg/Flag    | Required | Description                                                   |
| ----------- | -------- | ------------------------------------------------------------- |
| `<name>`    | Yes      | Prompt name (kebab-case)                                      |
| `--out`     | No       | Output directory (defaults to cwd)                            |
| `--partial` | No       | Create as a partial in `.prompts/partials/` (ignores `--out`) |

```bash
prompts create coverage-assessor --out src/agents/coverage-assessor
prompts create summary --partial
```

### `prompts setup`

Interactive project configuration for `.prompt` development. No flags -- fully interactive.

Configures:

1. VSCode file association (`*.prompt` -> Markdown)
2. VSCode Liquid extension recommendation
3. `.gitignore` entry for generated `.prompts/client/` directory
4. `tsconfig.json` path alias (`~prompts` -> `./.prompts/client/index.ts`)

## Integration

Add a generate script to your `package.json`:

```json
{
  "scripts": {
    "prompts:generate": "prompts generate --out .prompts/client --includes \"prompts/**\" \"src/agents/**\""
  }
}
```

## References

- [File Format](file-format.md)
- [Code Generation & Library](codegen.md)
- [Setup](setup.md)
- [Troubleshooting](troubleshooting.md)
