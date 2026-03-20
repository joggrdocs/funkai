---
"@funkai/agents": minor
---

Add `TModel` generic to `AgentConfig` and `Agent` for discriminated model types in `evolve()`.

Previously, `evolve(base, (config) => ...)` always typed `config.model` as the full `Resolver<TInput, Model>` union, even when the base agent was created with a static `LanguageModel`. This required unnecessary narrowing with `isFunction()` before accessing `.modelId`.

Now the 5th generic `TModel` is inferred from `agent()` and threaded through `evolve()`, so `config.model` is correctly typed as `Model` (with `.modelId`) when the base agent uses a static model.
