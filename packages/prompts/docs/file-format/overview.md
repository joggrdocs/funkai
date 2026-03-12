# .prompt File Format

A `.prompt` file is a LiquidJS template with YAML frontmatter. It is a declarative prompt authoring format compiled to typed TypeScript at build time.

## Anatomy

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

## Template Language

| Syntax                                  | Purpose                             |
| --------------------------------------- | ----------------------------------- |
| `{{ var }}`                             | Variable output                     |
| `{{ var \| filter }}`                   | Filtered output                     |
| `{% if var %}...{% endif %}`            | Conditional                         |
| `{% for item in list %}...{% endfor %}` | Iteration                           |
| `{% render 'name', key: 'value' %}`     | Partial inclusion (build-time only) |

Strict filters are enabled -- unknown filters throw an error. Variable access is restricted to own properties only.

## Naming Convention

Names must match `^[a-z0-9-]+$` (lowercase, digits, hyphens). The `name` field in frontmatter is required and takes precedence. A file named `prompt.prompt` derives its name from the parent directory (e.g. `agents/gap-detector/prompt.prompt` becomes `gap-detector`).

## Discovery

The CLI scans `--roots` directories recursively (max depth 5). Files must have the `.prompt` extension. Symbolic links are skipped. Duplicate names across roots cause an error with paths listed.

Results are sorted alphabetically by name.

## File Structure

```text
📁 src/
├── 📁 agents/
│   └── 📁 coverage-assessor/
│       └── 📄 prompt.prompt
├── 📁 prompts/
│   ├── 📄 identity.prompt
│   └── 📄 constraints.prompt
```

## References

- [Frontmatter Reference](frontmatter.md)
- [Partials](partials.md)
- [Author a Prompt](../guides/author-prompt.md)
