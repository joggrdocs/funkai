# @funkai/models

## 0.4.0

### Minor Changes

- 6528121: Export additional provider types and update cost calculation to support surfaced AI SDK data.

## 0.3.3

### Patch Changes

- ef51bd7: docs(packages/models): document reasoning token semantics, cost precision, and registry error modes

  - Document that `reasoningTokens` must be exclusive of `outputTokens` to avoid double-counting
  - Add floating-point imprecision note to `UsageCost` interface
  - Add `@throws` documentation to `createProviderRegistry` resolve function
  - Add `SAFETY` comment explaining double `as` cast in provider resolution
  - Fix file structure: move private `errorMessage` helper after exports

## 0.3.2

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

## 0.3.1

### Patch Changes

- c4e81fd: Upgrade runtime dependencies to latest versions

## 0.3.0

### Minor Changes

- 8b89d9c: Simplify API surface across all packages: replace OpenRouter-specific provider layer with generic registry pattern, streamline agent internals, and restructure prompt entry points.

  Migration notes:

  - `@funkai/agents`: `AgentConfig.resolver` is replaced by `AgentConfig.registry`.
  - `@funkai/models`: OpenRouter-specific provider exports (`openrouter.ts`, `resolver.ts`) were removed in favor of `createProviderRegistry` and `ProviderRegistry`.
  - `@funkai/prompts`: Runtime helpers moved to `@funkai/prompts/runtime`, CLI helpers moved to `@funkai/prompts/cli`.

## 0.2.1

### Patch Changes

- 153c393: refactor: deep review cleanup across all packages

  - **@funkai/agents**: Remove dead code (`resolve.ts`, `attempt.ts`), fix stale "Workflow" JSDoc references, deduplicate `buildOnFinishHandler`, complete `writeLog` JSDoc, remove orphaned `ResolveParam` export
  - **@funkai/models**: Export missing `ProviderFactory` and `ProviderMap` types, convert per-provider `*Model()` lookup from O(n) `.find()` to O(1) Map, fix floating-point precision artifacts in generated pricing data
  - **@funkai/prompts**: Rename generic `engine` export to `liquidEngine` for clarity

## 0.2.0

### Minor Changes

- 3b4a2ea: Extract @funkai/models package with models.dev catalog, per-provider subpath exports, and configurable model resolver
- 3730fcc: Add reasoning token support to cost calculation with optional reasoning rate in ModelPricing

### Patch Changes

- 0cd5ca9: Convert model() lookup from O(n) linear scan to O(1) Map-based lookup
- 4273b56: Bump @openrouter/ai-sdk-provider to v2.3.1
