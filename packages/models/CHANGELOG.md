# @funkai/models

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
