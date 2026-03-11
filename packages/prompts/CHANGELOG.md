# @funkai/prompts

## 0.1.0

### Minor Changes

- Initial release of `@funkai/prompts` — prompt SDK with LiquidJS templating and Zod validation.

  - `.prompt` file format with YAML frontmatter and Liquid template body
  - Schema-driven variable declarations with Zod validation at render time
  - Partial support via `{% render %}` tags with custom and built-in partials
  - Group-based prompt organization with nested namespaces
  - Generated TypeScript modules with full type safety
  - Built-in partials: `identity`, `constraints`, `tools`
