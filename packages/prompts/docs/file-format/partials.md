# Partials

Partials are reusable template fragments included with `{% render %}` tags. They are resolved and flattened at build time -- the generated output contains no render tags.

## Syntax

```liquid
{% render 'identity', role: 'Coverage Assessor', desc: 'an expert at assessing documentation coverage' %}
```

Only literal string parameters are supported. Variable references (e.g. `key: myVar`) are not allowed and throw an error at codegen time. Whitespace trim variants `{%-` and `-%}` are supported.

## Resolution Order

Partials are resolved from two locations, searched in order (first match wins):

| Priority | Location             | Description                                      |
| -------- | -------------------- | ------------------------------------------------ |
| 1        | `.prompts/partials/` | Custom project partials (committed to git)       |
| 2        | SDK `src/prompts/`   | Built-in partials shipped with `@funkai/prompts` |

Custom partials take precedence — a custom partial with the same name as a built-in overrides it.

## Built-in Partials

| Partial       | Parameters                                         | Purpose                                             |
| ------------- | -------------------------------------------------- | --------------------------------------------------- |
| `identity`    | `role`, `desc`, `context` (optional)               | Agent identity block (`<identity>` wrapper)         |
| `constraints` | `in_scope`, `out_of_scope`, `rules` (all optional) | Scoping constraints block (`<constraints>` wrapper) |
| `tools`       | `tools` (optional)                                 | Tool listing block (`<tools>` wrapper)              |

## Identity Partial

```liquid
<identity>
You are {{ role }}, {{ desc }}.
{% if context %}
{{ context }}
{% endif %}
</identity>
```

## Constraints Partial

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

## Custom Partials

Place custom `.prompt` files in `.prompts/partials/`:

```
📁 .prompts/
├── 📁 client/       # Generated (gitignored)
└── 📁 partials/     # Custom partials (committed)
    └── 📄 summary.prompt
```

The CLI auto-discovers this directory:

- `prompts generate` derives it from `--out` (sibling `partials/` dir)
- `prompts lint` defaults to `.prompts/partials` (configurable via `--partials`)

## References

- [File Format Overview](overview.md)
- [Add a Partial](../guides/add-partial.md)
