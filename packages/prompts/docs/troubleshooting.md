# Troubleshooting

## Undefined variable lint error

**Fix:** Add the variable to the frontmatter `schema` block, or remove it from the template.

## Unused variable lint warning

**Fix:** Remove the variable from `schema`, or use it in the template body.

## Duplicate prompt name

**Fix:** Two `.prompt` files share the same `name` field. Rename one to a unique kebab-case identifier.

## Invalid prompt name

**Fix:** Names must match `^[a-z0-9-]+$` — lowercase letters, digits, and hyphens only.

## Partial variable reference error

**Fix:** Only literal string parameters are supported in `{% render %}` tags. Replace variable references with string literals.

## Dangerous variable name

**Fix:** `__proto__`, `constructor`, and `prototype` are forbidden variable names. Choose a different name.

## TypeScript can't find `~prompts`

**Fix:** Add the path alias to `tsconfig.json`: `"~prompts": ["./.prompts/client/index.ts"]`. Or run `prompts setup`.

## Generated files not updating

**Fix:** Re-run `prompts generate` after editing `.prompt` files. Generated output is not watched.

## VSCode shows `.prompt` as plain text

**Fix:** Run `prompts setup` or add `"files.associations": { "*.prompt": "markdown" }` to `.vscode/settings.json`.
