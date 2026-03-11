# CLI Overview

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
    CLI->>FS: Discover .prompt files from roots
    CLI->>CLI: Parse frontmatter + extract variables
    CLI->>CLI: Lint (schema vs template match)
    CLI->>CLI: Flatten partials
    CLI->>FS: Write generated .ts modules
    FS-->>Dev: Import typed prompts from ~prompts
```

## Commands

| Command            | Alias | Description                                    |
| ------------------ | ----- | ---------------------------------------------- |
| `prompts generate` | `gen` | Generate typed TS modules from `.prompt` files |
| `prompts lint`     | ---   | Validate `.prompt` files without generating    |
| `prompts create`   | ---   | Scaffold a new `.prompt` file                  |
| `prompts setup`    | ---   | Interactive project configuration              |

See the [Commands Reference](commands.md) for flags, examples, and diagnostics.

## Integration

Add a generate script to your `package.json`:

```json
{
  "scripts": {
    "prompts:generate": "prompts generate --out .prompts/client --roots prompts src/agents"
  }
}
```

## References

- [Commands Reference](commands.md)
- [Code Generation](../codegen/overview.md)
- [Setup Guide](../guides/setup-project.md)
