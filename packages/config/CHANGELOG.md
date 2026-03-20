# @funkai/config

## 0.2.0

### Minor Changes

- 3fa83a3: feat(cli): add funkai.config.ts support and interactive setup

  - New `@funkai/config` package with `defineConfig()`, Zod schema, and `FunkaiConfig` type
  - `funkai setup` is now interactive: select domains (prompts/agents), create `funkai.config.ts`, run domain-specific setup
  - `funkai prompts generate` and `funkai prompts lint` now fall back to config when `--out`/`--roots` are omitted
  - `funkai prompts create` defaults to first root from config when `--out` is omitted
  - Config is loaded from the git root via kidd-cli's c12 integration

- c8569db: feat(prompts): add createPrompt, createPromptGroup, and config-based group assignment

  - Add `createPrompt<T>(config)` factory for building prompt modules at runtime and codegen
  - Add `createPromptGroup(name, prompts)` for grouping prompt modules into namespaces
  - Add `PromptConfig<T>` type for prompt module configuration
  - Codegen now uses `createPrompt()` instead of raw object literals
  - Scope name uniqueness to group+name instead of global name
  - Derive file slugs and import names from group+name to avoid collisions
  - Replace `roots` config field with `includes`/`excludes` glob patterns
  - Add `groups` config field for pattern-based group assignment via picomatch
  - Frontmatter `group` takes precedence over config-defined groups
  - Updated banner format for generated files
