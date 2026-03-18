---
"@funkai/models": minor
"@funkai/agents": minor
"@funkai/prompts": minor
"@funkai/cli": patch
---

Simplify API surface across all packages: replace OpenRouter-specific provider layer with generic registry pattern, streamline agent internals, and restructure prompt entry points.

Migration notes:
- `@funkai/agents`: `AgentConfig.resolver` is replaced by `AgentConfig.registry`.
- `@funkai/models`: OpenRouter-specific provider exports (`openrouter.ts`, `resolver.ts`) were removed in favor of `createProviderRegistry` and `ProviderRegistry`.
- `@funkai/prompts`: Runtime helpers moved to `@funkai/prompts/runtime`, CLI helpers moved to `@funkai/prompts/cli`.
