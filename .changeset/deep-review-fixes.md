---
"@funkai/agents": patch
"@funkai/models": patch
"@funkai/prompts": patch
---

refactor: deep review cleanup across all packages

- **@funkai/agents**: Remove dead code (`resolve.ts`, `attempt.ts`), fix stale "Workflow" JSDoc references, deduplicate `buildOnFinishHandler`, complete `writeLog` JSDoc, remove orphaned `ResolveParam` export
- **@funkai/models**: Export missing `ProviderFactory` and `ProviderMap` types, convert per-provider `*Model()` lookup from O(n) `.find()` to O(1) Map, fix floating-point precision artifacts in generated pricing data
- **@funkai/prompts**: Rename generic `engine` export to `liquidEngine` for clarity
