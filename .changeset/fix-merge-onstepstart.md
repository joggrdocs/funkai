---
"@funkai/agents": patch
---

Fix config-level `onStepStart` hook not being merged when forwarding to sub-agents. Previously only the per-call `onStepStart` was forwarded; the config hook was silently dropped. Also adds `onStepStart` to `AgentConfig` for parity with `onStepFinish`.
