---
"@funkai/agents": minor
---

Add `AgentChainEntry` type and `agentChain` field to `StepInfo` and `StepFinishEvent` for agent ancestry tracking. Forward `onStepStart`/`onStepFinish` hooks from flow agent `$.agent()` to sub-agents, enabling full observability of nested agent steps from root hooks.
