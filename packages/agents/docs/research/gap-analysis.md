# Research: Agent SDK Gap Analysis

> **Date**: 2026-03-06
> **AI SDK Version**: `^6.0.111`

## Overview

This document consolidates all identified gaps between our agent SDK wrapper and the underlying Vercel AI SDK v6 capabilities, specifically for supporting agentic loop control, context management, and sub-agent orchestration.

For detailed analysis of each area, see:

- [prepareStep and activeTools](./prepare-step-and-active-tools.md)
- [experimental_context](./experimental-context.md)
- [Sub-Agent Model](./sub-agent-model.md)

## Gap Summary

| #   | Gap                                    | Severity   | Current State                                                                                            | AI SDK Capability                                                                                        |
| --- | -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | No `prepareStep` support               | **High**   | `AgentConfig`/`AgentOverrides` have no field; `agent.ts` does not pass it to `generateText`/`streamText` | `prepareStep` callback fires before each step; can modify model, messages, tools, system prompt, context |
| 2   | No `activeTools` support               | **High**   | Not exposed at any layer                                                                                 | Top-level and per-step tool restriction via string array of tool names                                   |
| 3   | No `experimental_context` support      | **High**   | Not exposed; `tool()` drops the second execute arg that carries it                                       | User-defined state flows through `prepareStep`, tool `execute`, and lifecycle hooks                      |
| 4   | `tool()` drops AI SDK execute options  | **High**   | `tool.ts:111` wraps as `(data) => config.execute(data)`, discarding options                              | Second arg provides `{ experimental_context, abortSignal, messages, toolCallId }`                        |
| 5   | No context forwarding to sub-agents    | **Medium** | Sub-agents start fresh with only their `input`                                                           | `experimental_context` could carry parent state to child tools                                           |
| 6   | No dynamic sub-agent spawning          | **Medium** | `agents` config is static at creation time                                                               | `prepareStep` + `activeTools` can dynamically add/remove tools per step                                  |
| 7   | No shared state between sibling agents | **Medium** | Sub-agents are fully isolated                                                                            | `experimental_context` accumulation via `prepareStep`                                                    |
| 8   | No per-delegation step budget          | **Low**    | Child agents use their own `maxSteps` (default 20)                                                       | `AgentOverrides.maxSteps` exists but isn't used in sub-agent wrapper                                     |
| 9   | No result-to-context feedback          | **Medium** | Sub-agent output is only a tool result string                                                            | `prepareStep` can accumulate tool results into context between steps                                     |

## Impact on Use Cases

### Agentic Loop Control

Without `prepareStep`, the agentic loop is fully model-driven with no programmatic intervention between steps. Cannot:

- Compress context when it grows too large (token budget management)
- Restrict tools to specific phases of execution
- Switch models based on task complexity
- Adapt system prompts based on progress

### Sub-Agent Orchestration

Without context forwarding and `prepareStep`, sub-agents operate in isolation. Cannot:

- Pass parent conversation context to child agents
- Accumulate findings across multiple delegations
- Dynamically decide which sub-agents to make available
- Coordinate sibling agents through shared state

### Tool Context Access

Without forwarding the execute options, tools are blind to ambient state. Cannot:

- Access auth tokens or session info from context
- Read accumulated state from prior steps
- Use the `abortSignal` provided by the AI SDK (note: our tools do not receive it, though sub-agent wrappers do)

## Recommended Implementation Order

```
Phase 1: Foundation (P0)
├── Wire prepareStep through AgentConfig + AgentOverrides + agent.ts
├── Wire activeTools through AgentConfig + AgentOverrides + agent.ts
├── Wire experimental_context through AgentConfig + AgentOverrides + agent.ts
└── Fix tool() execute to forward AI SDK options (context + abortSignal)

Phase 2: Sub-Agent Enhancement (P1)
├── Context-aware sub-agent wrapper in buildAITools
├── Per-delegation maxSteps support
└── Result accumulation via prepareStep example/utility

Phase 3: Advanced Patterns (P2)
├── Dynamic agent spawning via prepareStep
├── Shared state store tool
└── Message compression/summarization utilities
```

## Files That Need Changes

| File                      | Changes                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `src/core/agent/types.ts` | Add `prepareStep`, `activeTools`, `context` to `AgentConfig` and `AgentOverrides` |
| `src/core/agent/agent.ts` | Forward new fields to `generateText`/`streamText` calls                           |
| `src/core/tool.ts`        | Extend `ToolConfig.execute` signature; forward AI SDK options in wrapper          |
| `src/core/agent/utils.ts` | Update `buildAITools` sub-agent wrapper to forward context                        |
| `src/index.ts`            | Export new types                                                                  |
