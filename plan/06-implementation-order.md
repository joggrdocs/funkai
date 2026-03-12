# 06 — Implementation Order

## Logger & Context Uniformity

Both `agent()` and `flowAgent()` follow the same logger injection pattern:

- **Config-level**: `config.logger ?? createDefaultLogger()`
- **Per-call override**: `overrides.logger` replaces the base logger
- **Child scoping**: `.child({ agentId })` for agents, `.child({ flowAgentId })` for flows

Context is internal-only. `agent()` does not create a `Context` object — it
passes signal directly to the AI SDK and manages its own logger. `flowAgent()`
creates `Context { signal, log, trace, messages }` and threads it through
the step builder, which is identical to how `workflow()` works today.

When `$.agent()` runs inside a flow, the step builder bridges the gap by
injecting the flow's scoped logger and signal into the agent call
(`factory.ts` agent step). This means logger context propagates correctly
from flow → step builder → agent without the agent needing to know about
the parent flow's Context.

No changes needed to `agent()` to support this — the step builder already
handles injection.

---

## Phase 1: FlowAgent core (in `@funkai/agents`)

Build the new `flowAgent()` factory alongside the existing `workflow()`.
This is the biggest piece of work and validates the design before any
package splitting.

### 1.1 Add message collector to Context

Extend the internal `Context` interface to carry a `messages` array.
Steps push synthetic tool-call messages as they execute.

**Files:**
- `src/lib/context.ts` — add `messages: Message[]` to `Context`

### 1.2 Update step builder to produce messages

Modify `executeStep()` in the step builder to produce tool-call and
tool-result messages for each step execution. Push them to
`ctx.messages`.

**Files:**
- `src/core/workflows/steps/factory.ts` — add message production to `executeStep()`
- New helper: `src/core/flow-agent/messages.ts` — functions to create synthetic
  `ToolCallPart`, `ToolResultPart`, assistant/tool messages from step data

### 1.3 Create `flowAgent()` factory

New factory that creates a `FlowAgent` matching the `Agent` interface.
Returns `GenerateResult<TOutput>` from `.generate()` and
`StreamResult<TOutput>` from `.stream()`.

**Files:**
- `src/core/flow-agent/flow-agent.ts` — main factory
- `src/core/flow-agent/types.ts` — `FlowAgent`, `FlowAgentConfig`, etc.

### 1.4 Update streaming to emit tool-call events

Modify the step builder's stream emission to produce AI SDK-compatible
tool-call/tool-result text events instead of custom `StepEvent` objects.

**Files:**
- `src/core/flow-agent/flow-agent.ts` — stream implementation
- `src/core/flow-agent/messages.ts` — stream event formatters

### 1.5 Add `stream: true` option to `$.agent()` step

Allow sub-agent text to pipe through the parent flow's stream.

**Files:**
- `src/core/workflows/steps/agent.ts` — add `stream` option to `AgentStepConfig`
- `src/core/workflows/steps/factory.ts` — handle streaming agent calls

### 1.6 Update engine for flowAgent

Rename and update the workflow engine to produce `FlowAgent` instances
with the new API.

**Files:**
- `src/core/flow-agent/engine.ts` — `createFlowEngine()`

### 1.7 Tests

- Unit tests for message production from steps
- Unit tests for flowAgent generate/stream
- Integration test: flowAgent used as sub-agent in regular agent
- Integration test: streaming with concurrent steps

### 1.8 Deprecate `workflow()`

Mark `workflow()` as deprecated. It internally delegates to `flowAgent()`
and wraps the result to maintain backward compatibility.

**Files:**
- `src/core/workflows/workflow.ts` — add `@deprecated` JSDoc, delegate

---

## Phase 2: Pluggable model resolution

### 2.1 Add `configure()` and `getModelResolver()`

New module for global configuration.

**Files:**
- `src/core/config.ts` — `configure()`, `getModelResolver()`

### 2.2 Update `resolveModel()` to use configured resolver

Remove hardcoded `openrouter()` call. Use configured resolver or throw
helpful error.

**Files:**
- `src/core/agent/utils.ts` — update `resolveModel()`

### 2.3 Tests

- Test that string model IDs throw without configured resolver
- Test that `configure()` sets the resolver globally
- Test that `LanguageModel` instances bypass resolution

---

## Phase 3: Package split

### 3.1 Create `@funkai/models`

Extract model catalog into standalone package.

**Steps:**
- Create `packages/models/` with package.json, tsconfig
- Move `src/core/models/` → `packages/models/src/`
- Move `models.config.json` and generation script
- Update `@funkai/agents` to import types from `@funkai/models`
- Update internal references in `@funkai/agents`

### 3.2 Create `@funkai/openrouter`

Extract OpenRouter provider into standalone package.

**Steps:**
- Create `packages/openrouter/` with package.json, tsconfig
- Move `src/core/provider/provider.ts` → `packages/openrouter/src/`
- Add `@funkai/models` as dependency (for `ModelId` type)
- Remove `@openrouter/ai-sdk-provider` from `@funkai/agents` dependencies

### 3.3 Create `@funkai/testing`

Extract testing utilities.

**Steps:**
- Create `packages/testing/` with package.json, tsconfig
- Move `src/testing/` → `packages/testing/src/`
- Add `@funkai/agents` as peer dependency

### 3.4 Create `funkai` root meta-package

Batteries-included package.

**Steps:**
- Create `packages/funkai/` with package.json
- Re-export all sub-packages
- Auto-configure OpenRouter as default model resolver
- Ensure `funkai` users get current zero-config behavior

### 3.5 Update monorepo config

- Update `pnpm-workspace.yaml`
- Update `turbo.json` build pipeline
- Update CI/CD for multi-package publishing

---

## Phase 4: Cleanup

### 4.1 Remove deprecated workflow API

In the next major version:
- Remove `workflow()` factory
- Remove all `Workflow*` types
- Remove backward-compat wrappers

### 4.2 Update documentation

- README for each package
- Migration guide
- Examples showing composable usage patterns

### 4.3 File structure (final)

```
packages/
  agents/
    src/
      core/
        agent/
          agent.ts          (unchanged)
          types.ts          (unchanged)
          output.ts         (unchanged)
          utils.ts          (updated: pluggable resolveModel)
        flow-agent/
          flow-agent.ts     (new: flowAgent factory)
          types.ts          (new: FlowAgent, FlowAgentConfig, etc.)
          engine.ts         (renamed from workflows/engine.ts)
          messages.ts       (new: synthetic message builders)
          steps/
            builder.ts      (moved from workflows/steps/)
            factory.ts      (updated: message production)
            step.ts         (moved)
            agent.ts        (moved, + stream option)
            map.ts          (moved)
            each.ts         (moved)
            reduce.ts       (moved)
            while.ts        (moved)
            all.ts          (moved)
            race.ts         (moved)
            result.ts       (moved)
        tool.ts             (unchanged)
        config.ts           (new: configure/getModelResolver)
        logger.ts           (unchanged)
        types.ts            (unchanged)
        provider/
          types.ts          (stays: TokenUsage, LanguageModel, etc.)
          usage.ts          (stays: sumTokenUsage, etc.)
      lib/
        context.ts          (updated: messages array)
        hooks.ts            (unchanged)
        middleware.ts        (unchanged)
        runnable.ts         (unchanged)
        trace.ts            (unchanged)
      utils/                (unchanged)
      testing/              (removed — moved to @funkai/testing)
      index.ts              (updated exports)

  models/
    src/
      index.ts              (model catalog, model(), tryModel(), models())
      providers/
        openai.ts           (auto-generated model definitions)
    models.config.json
    scripts/
      generate-models.ts

  openrouter/
    src/
      index.ts
      provider.ts           (createOpenRouter, openrouter)

  testing/
    src/
      index.ts
      context.ts            (createMockContext)
      logger.ts             (createMockLogger)

  prompts/                  (unchanged)

  funkai/
    src/
      index.ts              (re-exports + auto-configure)
```
