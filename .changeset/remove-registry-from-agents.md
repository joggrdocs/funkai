---
"@funkai/agents": minor
---

Remove `registry` field from `AgentConfig` and `resolveModel()` utility. The `Model` type now only accepts `LanguageModel` instances, and the deprecated `ModelRef` export has been removed. Pass AI SDK provider instances directly (e.g. `openai('gpt-4.1')`) instead of string model IDs with a registry.
