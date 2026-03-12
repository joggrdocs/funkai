# Frontmatter Reference

The YAML frontmatter block defines metadata and the variable schema for a `.prompt` file. It is delimited by `---` fences at the top of the file.

## Fields

| Field     | Required | Type     | Description                                      |
| --------- | -------- | -------- | ------------------------------------------------ |
| `name`    | Yes      | `string` | Unique kebab-case identifier (`^[a-z0-9-]+$`)    |
| `group`   | No       | `string` | Namespace path (e.g. `agents/coverage-assessor`) |
| `version` | No       | `string` | Version identifier                               |
| `schema`  | No       | `object` | Variable declarations map                        |

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

### Variable Fields

| Field         | Default  | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `type`        | `string` | Variable type (only `string` supported)              |
| `required`    | `true`   | Whether the variable must be provided at render time |
| `description` | --       | Human-readable description (used in generated JSDoc) |

## Validation Rules

- `name` is required and must match `^[a-z0-9-]+$`
- Frontmatter must be valid YAML between `---` delimiters
- `schema` must be an object (not an array)
- Shorthand `scope: string` expands to `{ type: 'string', required: true }`
- Missing or empty `name` throws a parse error with the file path
- Non-object frontmatter (e.g. a bare string) is rejected

## References

- [File Format Overview](overview.md)
- [Code Generation](../codegen/overview.md)
