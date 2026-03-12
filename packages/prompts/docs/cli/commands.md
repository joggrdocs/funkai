# CLI Commands Reference

## `prompts generate`

Generate typed TypeScript modules from `.prompt` files.

**Alias:** `gen`

| Flag       | Alias | Required | Description                                             |
| ---------- | ----- | -------- | ------------------------------------------------------- |
| `--out`    | `-o`  | Yes      | Output directory for generated files                    |
| `--roots`  | `-r`  | Yes      | Space-separated directories to scan for `.prompt` files |
| `--silent` | ---   | No       | Suppress output except errors                           |

```bash
prompts generate --out .prompts/client --roots prompts src/agents src/workflows
```

Custom partials are auto-discovered from the sibling `partials/` directory (relative to `--out`).

Runs lint validation automatically before generating. Exits with code 1 on lint errors.

## `prompts lint`

Validate `.prompt` files without generating output.

| Flag         | Alias | Required | Description                                              |
| ------------ | ----- | -------- | -------------------------------------------------------- |
| `--roots`    | `-r`  | Yes      | Directories to scan                                      |
| `--partials` | `-p`  | No       | Custom partials directory (default: `.prompts/partials`) |
| `--silent`   | ---   | No       | Suppress output except errors                            |

**Diagnostics:**

| Level | Meaning                                  |
| ----- | ---------------------------------------- |
| Error | Template variable not declared in schema |
| Warn  | Schema variable not used in template     |

```bash
prompts lint --roots prompts src/agents
```

## `prompts create`

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

## `prompts setup`

Interactive project configuration for `.prompt` development. No flags -- fully interactive.

Configures:

1. VSCode file association (`*.prompt` -> Markdown)
2. VSCode Liquid extension recommendation
3. `.gitignore` entry for generated `.prompts/client/` directory
4. `tsconfig.json` path alias (`~prompts` -> `./.prompts/client/index.ts`)

## References

- [CLI Overview](overview.md)
- [Troubleshooting](../troubleshooting.md)
