# .prompt File Format

A `.prompt` file is a LiquidJS template with YAML frontmatter. It is a declarative prompt authoring format compiled to typed TypeScript at build time.

## File Anatomy

Every `.prompt` file has two sections: a YAML frontmatter block delimited by `---` fences, and a LiquidJS template body.

```text
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

| Section             | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| Frontmatter (`---`) | YAML metadata block defining name, group, and variable schema |
| Body                | LiquidJS template rendered at runtime with typed variables    |

## Template Syntax

| Syntax                                  | Purpose                             |
| --------------------------------------- | ----------------------------------- |
| `{{ var }}`                             | Variable output                     |
| `{{ var \| filter }}`                   | Filtered output                     |
| `{% if var %}...{% endif %}`            | Conditional                         |
| `{% for item in list %}...{% endfor %}` | Iteration                           |
| `{% render 'name', key: 'value' %}`     | Partial inclusion (build-time only) |

Strict filters are enabled -- unknown filters throw an error. Variable access is restricted to own properties only.

## Frontmatter Reference

The YAML frontmatter block defines metadata and the variable schema.

### Fields

| Field     | Required | Type     | Description                                      |
| --------- | -------- | -------- | ------------------------------------------------ |
| `name`    | Yes      | `string` | Unique kebab-case identifier (`^[a-z0-9-]+$`)    |
| `group`   | No       | `string` | Namespace path (e.g. `agents/coverage-assessor`) |
| `version` | No       | `string` | Version identifier                               |
| `schema`  | No       | `object` | Variable declarations map                        |

### Validation Rules

- `name` is required and must match `^[a-z0-9-]+$`
- Frontmatter must be valid YAML between `---` delimiters
- `schema` must be an object (not an array)
- Missing or empty `name` throws a parse error with the file path
- Non-object frontmatter (e.g. a bare string) is rejected

## Schema Variables

Each key under `schema` declares a template variable. Two syntaxes are supported.

**Shorthand** -- type string only, defaults to required:

```yaml
schema:
  scope: string
```

**Full object** -- explicit control over all fields:

```yaml
schema:
  scope:
    type: string
    required: true
    description: Assessment scope
```

Shorthand `scope: string` expands to `{ type: 'string', required: true }`.

### Variable Fields

| Field         | Default  | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `type`        | `string` | Variable type (only `string` supported)              |
| `required`    | `true`   | Whether the variable must be provided at render time |
| `description` | --       | Human-readable description (used in generated JSDoc) |

## Naming and Discovery

Names must match `^[a-z0-9-]+$` (lowercase, digits, hyphens). The `name` field in frontmatter is required and takes precedence. A file named `prompt.prompt` derives its name from the parent directory (e.g. `agents/gap-detector/prompt.prompt` becomes `gap-detector`).

The CLI scans `--includes` glob patterns recursively (max depth 5). Files must have the `.prompt` extension. Symbolic links are skipped. Duplicate names across roots cause an error with paths listed. Results are sorted alphabetically by name.

### Recommended File Structure

```text
src/
  agents/
    coverage-assessor/
      prompt.prompt
  prompts/
    identity.prompt
    constraints.prompt
```

## Partials

Partials are reusable template fragments included with `{% render %}` tags. They are resolved and flattened at build time -- the generated output contains no render tags.

### Syntax

```liquid
{% render 'identity', role: 'Coverage Assessor', desc: 'an expert at assessing documentation coverage' %}
```

Only literal string parameters are supported. Variable references (e.g. `key: myVar`) are not allowed and throw an error at codegen time. Whitespace trim variants `{%-` and `-%}` are supported.

### Resolution Order

Partials are resolved from two locations, searched in order (first match wins):

| Priority | Location             | Description                                      |
| -------- | -------------------- | ------------------------------------------------ |
| 1        | `.prompts/partials/` | Custom project partials (committed to git)       |
| 2        | SDK `src/prompts/`   | Built-in partials shipped with `@funkai/prompts` |

Custom partials take precedence -- a custom partial with the same name as a built-in overrides it.

### Built-in Partials

| Partial       | Parameters                                         | Purpose                                             |
| ------------- | -------------------------------------------------- | --------------------------------------------------- |
| `identity`    | `role`, `desc`, `context` (optional)               | Agent identity block (`<identity>` wrapper)         |
| `constraints` | `in_scope`, `out_of_scope`, `rules` (all optional) | Scoping constraints block (`<constraints>` wrapper) |
| `tools`       | `tools` (optional)                                 | Tool listing block (`<tools>` wrapper)              |

**identity** source:

```liquid
<identity>
You are {{ role }}, {{ desc }}.
{% if context %}
{{ context }}
{% endif %}
</identity>
```

**constraints** source:

```liquid
<constraints>
{% if in_scope %}
## In Scope
{% for item in in_scope %}
- {{ item }}
{% endfor %}
{% endif %}
{% if out_of_scope %}
## Out of Scope
{% for item in out_of_scope %}
- {{ item }}
{% endfor %}
{% endif %}
{% if rules %}
## Rules
{% for rule in rules %}
- {{ rule }}
{% endfor %}
{% endif %}
</constraints>
```

### Custom Partials

Place custom `.prompt` files in `.prompts/partials/`:

```text
.prompts/
  client/       # Generated (gitignored)
  partials/     # Custom partials (committed)
    summary.prompt
```

The CLI auto-discovers this directory:

- `prompts generate` derives it from `--out` (sibling `partials/` dir)
- `prompts lint` defaults to `.prompts/partials` (configurable via `--partials`)

**Creating a custom partial:**

```bash
prompts create summary --partial
```

Or create `.prompts/partials/<name>.prompt` by hand:

```liquid
<summary>
{{ content }}
{% if notes %}
Notes: {{ notes }}
{% endif %}
</summary>
```

Use it in a `.prompt` file:

```liquid
{% render 'summary', content: 'Analysis complete' %}
```

Run `prompts generate` -- the partial is flattened into the generated output. No `{% render %}` tags remain.

**Overriding built-ins:** Create a file with the same name in `.prompts/partials/` (e.g. `.prompts/partials/identity.prompt`). Custom partials take precedence over SDK built-ins.

**Adding a built-in partial (SDK contributors):**

1. Create `packages/prompts/src/prompts/<name>.prompt`
2. Write the partial template using XML-style wrapper tags and Liquid variables
3. Test with a consumer `.prompt` file and run `prompts generate`

## Authoring Walkthrough

### Prerequisites

- `@funkai/prompts` installed
- Project configured ([Setup guide](setup.md))

### Steps

1. **Scaffold** with the CLI:

```bash
prompts create my-agent --out src/agents/my-agent
```

2. **Edit** the frontmatter -- set `name`, `group`, and `schema` variables.

3. **Write** the template body using `{{ var }}` syntax and conditionals.

4. **Add partials** if needed:

```liquid
{% render 'identity', role: 'Analyzer', desc: 'a code analyzer' %}
```

5. **Lint:**

```bash
prompts lint --includes "src/agents/**"
```

6. **Generate:**

```bash
prompts generate --out .prompts/client --includes "src/agents/**"
```

7. **Import and use:**

```ts
import { prompts } from "~prompts";

const text = prompts.myAgent.render({ scope: "full" });
```

### Verification

- `prompts lint` reports no errors
- Generated file exists at `.prompts/client/my-agent.ts`
- TypeScript compiles without errors

### Troubleshooting

#### Undefined variable error

**Fix:** Add the variable to the frontmatter `schema` block.

#### Duplicate prompt name

**Fix:** Two `.prompt` files share the same `name` -- rename one to a unique kebab-case identifier.

#### TypeScript can't find `~prompts`

**Fix:** Run `prompts setup` or add the path alias to `tsconfig.json`. See [setup.md](setup.md).

#### Variable reference not supported in partial

**Fix:** Only literal string params are allowed in `{% render %}` tags. Replace variable references with string literals.

#### Partial not found

**Fix:** Verify the file is in `.prompts/partials/` (custom) or `src/prompts/` (built-in) with `.prompt` extension.

## References

- [Code Generation & Library](codegen.md)
- [CLI](cli.md)
- [Setup](setup.md)
