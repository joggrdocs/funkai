# Prompts

## Library API

### createPrompt()

```typescript
function createPrompt<T>(config: PromptConfig<T>): PromptModule<T>;
```

Create a prompt module from a config object. Encapsulates LiquidJS template rendering and Zod variable validation.

### createPromptGroup()

```typescript
function createPromptGroup(config: unknown): unknown;
```

Create a group of related prompt modules. Used internally by codegen output to namespace modules under a group path.

### createPromptRegistry()

```typescript
function createPromptRegistry<T extends PromptNamespace>(modules: T): PromptRegistry<T>;
```

Create a typed, deep-frozen prompt registry from a (possibly nested) map of prompt modules. Typically called by generated `index.ts` output.

| Parameter | Type                        | Description                                                        |
| --------- | --------------------------- | ------------------------------------------------------------------ |
| `modules` | `T extends PromptNamespace` | Record of camelCase prompt names (or nested namespaces) to modules |

**Returns:** `PromptRegistry<T>` — deep-readonly, direct property access via `prompts.agents.coverageAssessor.render(vars)`.

## Types

### PromptConfig

```typescript
interface PromptConfig<T = unknown> {
  readonly name: string;
  readonly template: string;
  readonly schema: ZodType<T>;
  readonly group?: string;
}
```

| Field      | Type         | Required | Description                                                  |
| ---------- | ------------ | -------- | ------------------------------------------------------------ |
| `name`     | `string`     | Yes      | Kebab-case identifier (e.g. `'greeting'`, `'worker-system'`) |
| `template` | `string`     | Yes      | LiquidJS template string with `{{ variable }}` expressions   |
| `schema`   | `ZodType<T>` | Yes      | Zod schema for validating template variables                 |
| `group`    | `string`     | No       | Namespace path (e.g. `'agents'`, `'agents/core'`)            |

### PromptModule

```typescript
interface PromptModule<T = unknown> {
  readonly name: string;
  readonly group: string | undefined;
  readonly schema: ZodType<T>;
  render(variables: T): string;
  validate(variables: unknown): T;
}
```

| Member                | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `name`                | Prompt identifier                                                                |
| `group`               | Group/namespace path or `undefined`                                              |
| `schema`              | Zod schema for variable validation                                               |
| `render(variables)`   | Validate variables and render the LiquidJS template; returns the rendered string |
| `validate(variables)` | Validate and parse variables through the Zod schema; throws on failure           |

### PromptNamespace

```typescript
interface PromptNamespace {
  readonly [key: string]: PromptModule | PromptNamespace;
}
```

Recursive tree structure — values are either `PromptModule` leaves or nested `PromptNamespace` nodes.

### PromptRegistry

```typescript
type PromptRegistry<T extends PromptNamespace> = {
  readonly [K in keyof T]: T[K] extends PromptModule
    ? T[K]
    : T[K] extends PromptNamespace
      ? PromptRegistry<T[K]>
      : T[K];
};
```

Deep-readonly version of a prompt tree. Prevents reassignment at any nesting level.

## .prompt File Format

`.prompt` files are Markdown files with a YAML frontmatter block followed by a LiquidJS template body.

```
---
name: greeting
group: agents
schema:
  name: string
  place:
    type: string
    required: true
    description: The destination name
---

Hello {{ name }}, welcome to {{ place }}!
```

### Frontmatter Fields

| Field     | Required | Type     | Constraint     | Description                                      |
| --------- | -------- | -------- | -------------- | ------------------------------------------------ |
| `name`    | Yes      | `string` | `^[a-z0-9-]+$` | Unique kebab-case identifier                     |
| `group`   | No       | `string` | —              | Namespace path (e.g. `agents/coverage-assessor`) |
| `version` | No       | `string` | —              | Version identifier                               |
| `schema`  | No       | `object` | —              | Variable declarations map                        |

### Schema Variable Fields

Each key under `schema` declares a template variable.

**Shorthand** (type string only, defaults to required):

```yaml
schema:
  scope: string
```

**Full object**:

```yaml
schema:
  scope:
    type: string
    required: true
    description: Assessment scope
```

| Field         | Default  | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `type`        | `string` | Variable type (`string` only)                        |
| `required`    | `true`   | Whether variable must be provided at render time     |
| `description` | —        | Human-readable description (used in generated JSDoc) |

### Template Syntax

The template body uses LiquidJS. Variables declared in `schema` are available as `{{ variableName }}` expressions. Partials from the sibling `partials/` directory can be included with `{% render 'partial-name' %}`.

## CLI Commands

All commands are available via the `prompts` binary.

### prompts generate

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

### prompts lint

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

### prompts create

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

### prompts setup

Interactive project configuration. No flags — fully interactive.

Configures:

1. VSCode file association (`*.prompt` → Markdown)
2. VSCode Liquid extension recommendation
3. `.gitignore` entry for generated `.prompts/client/` directory
4. `tsconfig.json` path alias (`~prompts` → `./.prompts/client/index.ts`)
