# @funkai/prompts

## 0.3.0

### Minor Changes

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

## 0.2.0

### Minor Changes

- 8b89d9c: Simplify API surface across all packages: replace OpenRouter-specific provider layer with generic registry pattern, streamline agent internals, and restructure prompt entry points.

  Migration notes:

  - `@funkai/agents`: `AgentConfig.resolver` is replaced by `AgentConfig.registry`.
  - `@funkai/models`: OpenRouter-specific provider exports (`openrouter.ts`, `resolver.ts`) were removed in favor of `createProviderRegistry` and `ProviderRegistry`.
  - `@funkai/prompts`: Runtime helpers moved to `@funkai/prompts/runtime`, CLI helpers moved to `@funkai/prompts/cli`.

## 0.1.2

### Patch Changes

- 153c393: refactor: deep review cleanup across all packages

  - **@funkai/agents**: Remove dead code (`resolve.ts`, `attempt.ts`), fix stale "Workflow" JSDoc references, deduplicate `buildOnFinishHandler`, complete `writeLog` JSDoc, remove orphaned `ResolveParam` export
  - **@funkai/models**: Export missing `ProviderFactory` and `ProviderMap` types, convert per-provider `*Model()` lookup from O(n) `.find()` to O(1) Map, fix floating-point precision artifacts in generated pricing data
  - **@funkai/prompts**: Rename generic `engine` export to `liquidEngine` for clarity

## 0.1.1

### Patch Changes

- 1beb2d2: Update package README documentation

## 0.1.0

### Minor Changes

- Initial release of `@funkai/prompts` — prompt SDK with LiquidJS templating and Zod validation.

  - `.prompt` file format with YAML frontmatter and Liquid template body
  - Schema-driven variable declarations with Zod validation at render time
  - Partial support via `{% render %}` tags with custom and built-in partials
  - Group-based prompt organization with nested namespaces
  - Generated TypeScript modules with full type safety
  - Built-in partials: `identity`, `constraints`, `tools`
