---
"@funkai/agents": minor
---

Add `Resolver` pattern and `evolve()` function for environment-aware agent configuration.

**Resolver pattern**: Config fields (`model`, `system`, `tools`, `agents`, `maxSteps`, `logger`) now accept `T | ((params: { input }) => T | Promise<T>)` so they resolve dynamically at `.generate()` / `.stream()` time based on validated input.

**`evolve()` function**: Create a new agent or flow agent from an existing one with config overrides. Scalars (name, model, system, hooks, etc.) are replaced; records (tools, agents) are shallow-merged.
