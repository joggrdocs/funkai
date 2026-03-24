# Prompts CLI

Command-line interface for working with `.prompt` files. Handles code generation, validation, scaffolding, and project setup. All commands are available via the `funkai prompts` binary from `@funkai/cli`.

## prompts generate

Generate typed TypeScript modules from `.prompt` files. Also available as `prompts gen`.

```bash
prompts generate --out .prompts/client --includes "prompts/**" "src/agents/**"
```

| Flag         | Alias | Required | Description                                 |
| ------------ | ----- | -------- | ------------------------------------------- |
| `--out`      | `-o`  | Yes      | Output directory for generated files        |
| `--includes` | `-r`  | Yes      | Glob pattern(s) to scan for `.prompt` files |
| `--silent`   | —     | No       | Suppress output except errors               |

Runs lint validation automatically before generating. Exits with code 1 on lint errors. Custom partials are auto-discovered from the sibling `partials/` directory relative to `--out`.

## prompts lint

Validate `.prompt` files without generating output.

```bash
prompts lint --includes "prompts/**" "src/agents/**"
```

| Flag         | Alias | Required | Description                                              |
| ------------ | ----- | -------- | -------------------------------------------------------- |
| `--includes` | `-r`  | Yes      | Glob pattern(s) to scan for `.prompt` files              |
| `--partials` | `-p`  | No       | Custom partials directory (default: `.prompts/partials`) |
| `--silent`   | —     | No       | Suppress output except errors                            |

| Diagnostic level | Meaning                                  |
| ---------------- | ---------------------------------------- |
| Error            | Template variable not declared in schema |
| Warn             | Schema variable not used in template     |

## prompts create

Scaffold a new `.prompt` file.

```bash
prompts create coverage-assessor --out src/agents/coverage-assessor
prompts create summary --partial
```

| Argument / Flag | Required | Description                                                   |
| --------------- | -------- | ------------------------------------------------------------- |
| `<name>`        | Yes      | Prompt name (kebab-case)                                      |
| `--out`         | No       | Output directory (defaults to cwd)                            |
| `--partial`     | No       | Create as a partial in `.prompts/partials/` (ignores `--out`) |

## prompts setup

Interactive project configuration. No flags — fully interactive.

Configures:

1. VSCode file association (`*.prompt` -> Markdown)
2. VSCode Liquid extension recommendation
3. `.gitignore` entry for generated `.prompts/client/` directory
4. `tsconfig.json` path alias (`~prompts` -> `./.prompts/client/index.ts`)

## See Also

- [Prompts concept](/concepts/prompts) — overview of the `.prompt` file format and codegen workflow
- [`createPrompt()` reference](/reference/prompts/create-prompt) — runtime prompt module API
- [`createPromptRegistry()` reference](/reference/prompts/create-prompt-registry) — registry API
