# 05 — Migration Path

## Breaking changes

### 1. `workflow()` → `flowAgent()`

The `workflow()` factory is renamed to `flowAgent()`. The handler
signature is unchanged. The config gains `onStepFinish` (agent-style)
and the return type changes from `WorkflowResult` to `GenerateResult`
with extra fields.

```typescript
// Before
import { workflow } from "@funkai/agents";
const w = workflow({ name: "...", input: z, output: z }, handler);
const result = await w.generate(input);
result.trace; // TraceEntry[]
result.duration; // number
result.usage; // TokenUsage
// result.messages — does not exist

// After
import { flowAgent } from "@funkai/agents";
const f = flowAgent({ name: "...", input: z, output: z }, handler);
const result = await f.generate(input);
result.output; // TOutput (same)
result.messages; // Message[] (NEW — synthetic tool calls)
result.usage; // TokenUsage (same)
result.finishReason; // string (NEW — 'stop')
result.trace; // TraceEntry[] (still available as extra field)
result.duration; // number (still available as extra field)
```

### 2. `WorkflowResult` → `GenerateResult` (extended)

Code that typed results as `WorkflowResult<T>` needs to update:

```typescript
// Before
const result: WorkflowResult<MyOutput> = ...

// After
const result: GenerateResult<MyOutput> = ...
// or for full type including trace/duration:
const result: FlowAgentGenerateResult<MyOutput> = ...
```

### 3. `WorkflowStreamResult` → `StreamResult`

Stream results now match the `Agent` stream result shape:

```typescript
// Before
result.stream; // ReadableStream<StepEvent>
result.output; // TOutput (resolved)
result.trace; // TraceEntry[] (resolved)

// After
result.fullStream; // AsyncIterableStream<StreamPart> (typed events)
result.output; // Promise<TOutput>
result.messages; // Promise<Message[]>
result.usage; // Promise<TokenUsage>
```

### 4. String model IDs require `configure()`

Users who pass string model IDs to `agent()` need to configure a
resolver first:

```typescript
// Before (implicit OpenRouter)
import { agent } from '@funkai/agents'
const a = agent({ model: 'openai/gpt-4.1', ... })

// After (explicit)
import { agent, configure } from '@funkai/agents'
import { openrouter } from '@funkai/openrouter'
configure({ resolveModel: openrouter })
const a = agent({ model: 'openai/gpt-4.1', ... })

// Or: use funkai root package (auto-configures OpenRouter)
import { agent } from 'funkai'
const a = agent({ model: 'openai/gpt-4.1', ... })  // works
```

### 5. Model catalog moves to `@funkai/models`

```typescript
// Before
import { model, tryModel, models } from "@funkai/agents";

// After
import { model, tryModel, models } from "@funkai/models";
// or
import { model, tryModel, models } from "funkai"; // re-exported
```

### 6. OpenRouter provider moves to `@funkai/openrouter`

```typescript
// Before
import { createOpenRouter, openrouter } from "@funkai/agents";

// After
import { createOpenRouter, openrouter } from "@funkai/openrouter";
// or
import { createOpenRouter, openrouter } from "funkai"; // re-exported
```

### 7. Testing utilities move to `@funkai/testing`

```typescript
// Before
import { createMockContext, createMockLogger } from "@funkai/agents/testing";

// After
import { createMockContext, createMockLogger } from "@funkai/testing";
```

### 8. `createWorkflowEngine` → `createFlowEngine`

```typescript
// Before
import { createWorkflowEngine } from '@funkai/agents'
const engine = createWorkflowEngine({ $: { custom: ... } })

// After
import { createFlowEngine } from '@funkai/agents'
const engine = createFlowEngine({ $: { custom: ... } })
```

### 9. Type renames

| Before                             | After                                   |
| ---------------------------------- | --------------------------------------- |
| `Workflow<TInput, TOutput>`        | `FlowAgent<TInput, TOutput>`            |
| `WorkflowConfig<TInput, TOutput>`  | `FlowAgentConfig<TInput, TOutput>`      |
| `WorkflowOverrides`                | `FlowAgentOverrides`                    |
| `WorkflowResult<TOutput>`          | removed (use `GenerateResult<TOutput>`) |
| `WorkflowStreamResult<TOutput>`    | removed (use `StreamResult<TOutput>`)   |
| `WorkflowHandler<TInput, TOutput>` | `FlowAgentHandler<TInput, TOutput>`     |
| `WorkflowParams<TInput>`           | `FlowAgentParams<TInput>`               |
| `WorkflowFactory`                  | `FlowFactory`                           |
| `EngineConfig`                     | `FlowEngineConfig`                      |
| `workflowUsage()`                  | `flowAgentUsage()`                      |
| `WorkflowTokenUsage`               | `FlowAgentTokenUsage`                   |

---

## Non-breaking changes

These are additive and don't require migration:

1. `flowAgent.generate()` now returns `messages` and `finishReason`
2. Steps produce synthetic tool-call messages
3. `flowAgent.stream()` emits tool-call events in the text stream
4. `configure()` is new — only needed if using string model IDs without `funkai`

---

## Deprecation strategy

### Phase 1: Add new, deprecate old

- Add `flowAgent()` alongside `workflow()`
- Mark `workflow()` as `@deprecated` with JSDoc pointing to `flowAgent()`
- Keep `WorkflowResult`, `WorkflowConfig`, etc. as deprecated type aliases
- `workflow()` internally delegates to `flowAgent()` for compatibility

### Phase 2: Remove deprecated (next major)

- Remove `workflow()` factory
- Remove all `Workflow*` types
- Remove OpenRouter from `@funkai/agents` dependencies
- Remove implicit model resolution
