# @funkai/cli

## 0.1.3

### Patch Changes

- 8b89d9c: Simplify API surface across all packages: replace OpenRouter-specific provider layer with generic registry pattern, streamline agent internals, and restructure prompt entry points.

  Migration notes:

  - `@funkai/agents`: `AgentConfig.resolver` is replaced by `AgentConfig.registry`.
  - `@funkai/models`: OpenRouter-specific provider exports (`openrouter.ts`, `resolver.ts`) were removed in favor of `createProviderRegistry` and `ProviderRegistry`.
  - `@funkai/prompts`: Runtime helpers moved to `@funkai/prompts/runtime`, CLI helpers moved to `@funkai/prompts/cli`.

- Updated dependencies [8b89d9c]
  - @funkai/prompts@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies [153c393]
  - @funkai/prompts@0.1.2

## 0.1.1

### Patch Changes

- 1beb2d2: Update package README documentation
- Updated dependencies [1beb2d2]
  - @funkai/prompts@0.1.1

## 0.1.0

### Minor Changes

- Initial release of `@funkai/cli` — CLI for the funkai prompt SDK.

  - `funkai prompts generate` — Generate typed TypeScript modules from `.prompt` files
  - `funkai prompts lint` — Validate prompt files for undefined and unused variables
  - `funkai prompts create` — Scaffold new `.prompt` files and partials
  - `funkai prompts setup` — Interactive project configuration for VSCode, gitignore, and tsconfig
