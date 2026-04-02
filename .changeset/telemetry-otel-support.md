---
"@funkai/agents": minor
---

Add OpenTelemetry telemetry support. Agents, flow agents, and flow engines accept a `telemetry` config that threads through to the AI SDK's `experimental_telemetry` option. Auto-enriches spans with `functionId` (defaults to agent name) and `funkai.agentChain` metadata for multi-agent trace visibility. Telemetry propagates to sub-agents and merges across layers (engine -> flow -> agent -> per-call) with shallow-merged metadata.
