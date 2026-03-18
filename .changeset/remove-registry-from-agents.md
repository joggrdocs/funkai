---
"@funkai/agents": minor
---

Remove `registry` field from `AgentConfig` and `resolveModel()` utility. The `Model` type now only accepts `LanguageModel` instances — pass AI SDK provider instances directly (e.g. `openai('gpt-4.1')`) instead of string model IDs with a registry.
