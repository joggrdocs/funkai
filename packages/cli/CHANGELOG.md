# @funkai/cli

## 0.3.1

### Patch Changes

- Updated dependencies [ef51bd7]
  - @funkai/prompts@0.4.1

## 0.3.0

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

### Patch Changes

- Updated dependencies [3fa83a3]
- Updated dependencies [c8569db]
  - @funkai/config@0.2.0
  - @funkai/prompts@0.4.0

## 0.2.0

### Minor Changes

- 5d9fbeb: Enforce TypeScript and FP standards across all packages.

  **@funkai/agents**

  - `isAgent()` and `isFlowAgent()` now return proper type predicates (`value is Agent` / `value is FlowAgent`) instead of `boolean`
  - Added `@example` tags to exported `toJsonSchema`, `isZodObject`, `isZodArray`

  **@funkai/cli**

  - **Breaking:** `handleGenerate`, `handleLint`, `flattenPartials`, `parseFrontmatter` now accept a single params object instead of positional arguments
  - New exported interfaces: `HandleGenerateParams`, `HandleLintParams`, `FlattenPartialsParams`, `ParseFrontmatterParams`
  - `extractVariables` and `discoverPrompts` return `readonly` arrays
  - `parseSchemaBlock` returns `readonly SchemaVariable[]`

### Patch Changes

- b1e1d01: Fix bug and correctness issues across all packages.

  **@funkai/agents**

  - Export `createFlowEngine` and related types (`FlowEngineConfig`, `FlowFactory`, `CustomStepFactory`, `CustomStepDefinitions`, `TypedCustomSteps`)
  - Guard `resolvedInput` before passing to `onError` hooks (was `undefined` cast as `TInput`)
  - Fix `onStepStart` hook asymmetry: per-call override now merged with config hook
  - Remove deprecated unused `TraceType` alias

  **@funkai/prompts**

  - **Breaking:** `strictFilters` and `ownPropertyOnly` removed from `CreateEngineOptions` (now enforced as non-overridable safety defaults)

  **@funkai/models**

  - Add `provider/model` format validation for model IDs
  - Wrap `languageModel()` errors with model ID context

  **@funkai/cli**

  - Fix `$`-substitution bug in `flattenPartials` (`String.replace` function-form)
  - Add error context for partial render failures
  - `readJsonFile` now throws on malformed JSON instead of silently returning `{}`
  - Replace naive YAML line parsing with proper `yaml` parser
  - Extract `Liquid` engine to module-level singleton in `extractVariables`

- Updated dependencies [b1e1d01]
  - @funkai/prompts@0.3.0

## 0.1.4

### Patch Changes

- c4e81fd: Upgrade runtime dependencies to latest versions

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
