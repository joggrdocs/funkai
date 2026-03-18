---
"@funkai/agents": patch
---

Fix sub-agent tool names rejected by OpenAI, Azure, and other providers. Replaced colon separator (`agent:name`) with underscore (`agent_name`) to match the universally safe pattern `^[a-zA-Z_][a-zA-Z0-9_]*$`. Added runtime validation and compile-time `ToolSafeKey` type guard for sub-agent keys.
