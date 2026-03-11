# Add a Partial

## Custom Partials

Custom partials live in `.prompts/partials/` and are auto-discovered at build time. They take precedence over built-in SDK partials.

### Steps

1. Scaffold with the CLI or create manually:

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

2. Use in a `.prompt` file:

```liquid
{% render 'summary', content: 'Analysis complete' %}
```

3. Run `prompts generate` — the partial is flattened into the generated output.

### Overriding Built-ins

To override a built-in partial, create a file with the same name in `.prompts/partials/` (e.g. `.prompts/partials/identity.prompt`). Custom partials take precedence over SDK built-ins.

## Built-in Partials

Built-in partials require access to the `@funkai/prompts` source.

### Steps

1. Create `packages/prompts/src/prompts/<name>.prompt`.

2. Write the partial template — use XML-style wrapper tags and Liquid variables:

```liquid
<output>
{{ content }}
</output>
```

3. Test with a consumer `.prompt` file and run `prompts generate`.

4. Document the new partial in `docs/file-format/partials.md`.

## Verification

The generated `.ts` module contains the flattened partial content. No `{% render %}` tags remain.

## Troubleshooting

### Variable reference not supported

**Fix:** Only literal string params are allowed in `{% render %}` tags. Replace variable references with string literals.

### Partial not found

**Fix:** Verify the file is in `.prompts/partials/` (custom) or `src/prompts/` (built-in) with `.prompt` extension.

## References

- [Partials Reference](../file-format/partials.md)
- [File Format](../file-format/overview.md)
