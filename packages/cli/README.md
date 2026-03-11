<div align="center">
  <p><strong>@funkai/cli</strong></p>
  <p>CLI for the funkai prompt SDK — codegen, lint, create, and setup commands for <code>.prompt</code> files.</p>

<a href="https://www.npmjs.com/package/@funkai/cli"><img src="https://img.shields.io/npm/v/@funkai/cli" alt="npm version" /></a>
<a href="https://github.com/joggrdocs/funkai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/joggrdocs/funkai" alt="License" /></a>

</div>

## Features

- :gear: **Code generation** — Generate typed TypeScript modules from `.prompt` files.
- :mag: **Linting** — Validate prompt files for undefined and unused variables.
- :sparkles: **Scaffolding** — Create new `.prompt` files and partials with a single command.
- :wrench: **Project setup** — Configure VSCode, `.gitignore`, and `tsconfig.json` interactively.

## Install

```bash
npm install @funkai/cli
```

## Usage

### `funkai prompts generate`

Generate typed TypeScript modules from `.prompt` files.

```bash
funkai prompts generate --out .prompts/client --roots src/agents
```

| Flag         | Description                                         |
| ------------ | --------------------------------------------------- |
| `--out`      | Output directory for generated files                |
| `--roots`    | Directories to scan recursively for `.prompt` files |
| `--partials` | Custom partials directory                           |
| `--silent`   | Suppress output except errors                       |

### `funkai prompts lint`

Validate `.prompt` files without generating output.

```bash
funkai prompts lint --roots src/agents
```

| Flag         | Description                                              |
| ------------ | -------------------------------------------------------- |
| `--roots`    | Directories to scan                                      |
| `--partials` | Custom partials directory (default: `.prompts/partials`) |
| `--silent`   | Suppress output except errors                            |

### `funkai prompts create`

Scaffold a new `.prompt` file.

```bash
funkai prompts create my-agent
funkai prompts create my-agent --out src/agents/my-agent
```

| Flag        | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| `--name`    | Prompt name (kebab-case)                                      |
| `--out`     | Output directory (defaults to cwd)                            |
| `--partial` | Create as a partial in `.prompts/partials/` (ignores `--out`) |

### `funkai prompts setup`

Interactive project configuration for `.prompt` file development.

```bash
funkai prompts setup
```

Configures VSCode file associations, Liquid extension recommendation, `.gitignore` entries, and `tsconfig.json` path aliases.

## Documentation

See the [Prompts SDK docs](../prompts/docs/overview.md) for the full file format, library API, and guides.

## License

[MIT](../../LICENSE)
