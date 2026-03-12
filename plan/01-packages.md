# 01 — Package Split

## Dependency Graph

```
funkai (root meta-package)
├── @funkai/agents
├── @funkai/models
├── @funkai/openrouter
├── @funkai/testing
└── @funkai/prompts

@funkai/agents       → ai, zod, ts-pattern, es-toolkit, type-fest
@funkai/models       → ts-pattern, type-fest (zero AI SDK deps)
@funkai/openrouter   → @openrouter/ai-sdk-provider, @funkai/models
@funkai/testing      → @funkai/agents (peer dep)
@funkai/prompts      → (unchanged, standalone)
funkai               → re-exports @funkai/agents, @funkai/models, @funkai/openrouter, @funkai/prompts (not @funkai/testing)
```

## `@funkai/agents`

The core package. Contains everything needed to build agents and flow agents
with any AI SDK provider.

### Exports

```typescript
// Factories
export { agent } from "./core/agent/agent.js";
export { flowAgent } from "./core/flow-agent/flow-agent.js";
export { tool } from "./core/tool.js";
export { createFlowEngine } from "./core/flow-agent/engine.js";
export { createStepBuilder } from "./core/flow-agent/steps/factory.js";
export { createDefaultLogger } from "./core/logger.js";
export { configure } from "./core/config.js";

// Result utilities
export { ok, err, isOk, isErr } from "./utils/result.js";

// Usage utilities
export { agentUsage, flowAgentUsage, sumTokenUsage } from "./core/provider/usage.js";
export { collectUsages } from "./lib/trace.js";

// Error utilities
export { toError, safeStringify, safeStringifyJSON } from "./utils/error.js";

// Types (all the existing ones, renamed where needed)
export type { Agent, AgentConfig, AgentOverrides, GenerateResult, StreamResult, Message };
export type { FlowAgent, FlowAgentConfig, FlowAgentOverrides };
export type { Runnable, Model, Result, ResultError };
export type { Tool, ToolConfig };
export type { LanguageModel, TokenUsage, TokenUsageRecord };
export type { Logger, ExecutionContext };
export type { StepBuilder, StepConfig, StepResult, StepError, StepInfo };
export type { FlowEngine, FlowEngineConfig };
export type { TraceEntry, OperationType };
export type { Output } from "ai";
```

### What moves OUT

- `createOpenRouter()`, `openrouter()` → `@funkai/openrouter`
- `model()`, `tryModel()`, `models`, `MODELS` → `@funkai/models`
- `ModelId`, `ModelDefinition`, `ModelCategory`, `ModelPricing` → `@funkai/models`
- `OpenRouterLanguageModelId` → `@funkai/openrouter`
- `createMockContext()`, `createMockLogger()` → `@funkai/testing`

### What stays / is new

- `agent()` — unchanged
- `flowAgent()` — new, replaces `workflow()`
- `tool()` — unchanged
- `configure()` — new, sets global model resolver
- Result utilities — unchanged
- All internal lib code (hooks, middleware, runnable, trace, context) — stays

---

## `@funkai/models`

Provider-agnostic model catalog. Pricing metadata, categories, lookup.
No runtime AI SDK dependency.

### Exports

```typescript
export { model, tryModel, models } from "./models/index.js";
export { MODELS } from "./models/index.js";
export type { ModelId, ModelDefinition, ModelCategory, ModelPricing };
```

### Why separate

- The model catalog is useful without OpenRouter (cost estimation, UI, model selection)
- IDs are OpenRouter-format today but the metadata is provider-agnostic
- Auto-generated from `models.config.json` — has its own build step
- Zero runtime deps beyond `ts-pattern` and `type-fest`

---

## `@funkai/openrouter`

OpenRouter provider integration. Creates `LanguageModel` instances.

### Exports

```typescript
export { createOpenRouter, openrouter } from "./provider.js";
export type { OpenRouterLanguageModelId } from "./types.js";
```

### Dependencies

```json
{
  "dependencies": {
    "@openrouter/ai-sdk-provider": "^2.3.0",
    "@funkai/models": "workspace:*"
  },
  "peerDependencies": {
    "ai": "^6.0.0"
  }
}
```

---

## `@funkai/testing`

Mock utilities for testing agents and flow agents.

### Exports

```typescript
export { createMockContext } from "./context.js";
export { createMockLogger } from "./logger.js";
```

### Dependencies

```json
{
  "peerDependencies": {
    "@funkai/agents": "workspace:*"
  }
}
```

---

## `funkai` (root meta-package)

Batteries-included. Install one package, get everything.

### package.json

```json
{
  "name": "funkai",
  "dependencies": {
    "@funkai/agents": "workspace:*",
    "@funkai/models": "workspace:*",
    "@funkai/openrouter": "workspace:*",
    "@funkai/testing": "workspace:*",
    "@funkai/prompts": "workspace:*"
  }
}
```

### Exports

```typescript
// Re-export everything
export * from "@funkai/agents";
export * from "@funkai/models";
export * from "@funkai/openrouter";
export * from "@funkai/prompts";

// Testing is intentionally NOT re-exported from root
// (it's a devDependency concern)
```

---

## Consumer Install Patterns

```bash
# Batteries included
pnpm add funkai

# Just agents + bring your own provider
pnpm add @funkai/agents @ai-sdk/anthropic

# Agents + OpenRouter
pnpm add @funkai/agents @funkai/openrouter

# Just the model catalog (for cost estimation, etc)
pnpm add @funkai/models
```
