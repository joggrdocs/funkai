---
"@funkai/agents": minor
"@funkai/prompts": minor
"@funkai/models": patch
"@funkai/cli": patch
---

Fix bug and correctness issues across all packages.

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
