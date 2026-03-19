# @funkai/agents

## 0.8.0

### Minor Changes

- b1e1d01: Fix bug and correctness issues across all packages.

  **@funkai/agents**

  - Export `createFlowEngine` and related types (`FlowEngineConfig`, `FlowFactory`, `CustomStepFactory`, `CustomStepDefinitions`, `TypedCustomSteps`)
  - Guard `resolvedInput` before passing to `onError` hooks (was `undefined` cast as `TInput`)
  - Fix `onStepStart` hook asymmetry: per-call override now merged with config hook
  - Remove deprecated unused `TraceType` alias

  **@funkai/prompts**

  - **Breaking:** `strictFilters` and `ownPropertyOnly` removed from `CreateEngineOptions` (now enforced as non-overridable safety defaults)

  **@funkai/models**

  - Add `provider/model` format validation for model IDs
  - Wrap `languageModel()` errors with model ID context

  **@funkai/cli**

  - Fix `$`-substitution bug in `flattenPartials` (`String.replace` function-form)
  - Add error context for partial render failures
  - `readJsonFile` now throws on malformed JSON instead of silently returning `{}`
  - Replace naive YAML line parsing with proper `yaml` parser
  - Extract `Liquid` engine to module-level singleton in `extractVariables`

- 3b78ce6: Add `agents` field to flow agent config for evolvable agent dependencies

  Flow agents can now declare named agent dependencies in their config via `agents: { core, writer }`. These are passed to the handler as `agents` in the params object, enabling `evolve()` to shallow-merge agent overrides — solving the closure capture problem where `evolve()` couldn't rewire agents referenced inside a flow handler.

  ```typescript
  const pipeline = flowAgent(
    {
      name: "pipeline",
      input: schema,
      agents: { core: coreAgent },
    },
    async ({ input, $, agents }) => {
      await $.agent({ agent: agents.core, input });
    }
  );

  // Now works — handler receives evolvedCore instead of the static import
  evolve(pipeline, { agents: { core: evolvedCore } });
  ```

### Patch Changes

- 5d9fbeb: Enforce TypeScript and FP standards across all packages.

  **@funkai/agents**

  - `isAgent()` and `isFlowAgent()` now return proper type predicates (`value is Agent` / `value is FlowAgent`) instead of `boolean`
  - Added `@example` tags to exported `toJsonSchema`, `isZodObject`, `isZodArray`

  **@funkai/cli**

  - **Breaking:** `handleGenerate`, `handleLint`, `flattenPartials`, `parseFrontmatter` now accept a single params object instead of positional arguments
  - New exported interfaces: `HandleGenerateParams`, `HandleLintParams`, `FlattenPartialsParams`, `ParseFrontmatterParams`
  - `extractVariables` and `discoverPrompts` return `readonly` arrays
  - `parseSchemaBlock` returns `readonly SchemaVariable[]`

- Updated dependencies [b1e1d01]
  - @funkai/models@0.3.2

## 0.7.0

### Minor Changes

- 952b4b8: Add mapper function overload to `evolve()` for both `Agent` and `FlowAgent`. The mapper receives the stored config and returns partial overrides, enabling provider propagation patterns like rewiring model IDs to a different provider at deploy time.

### Patch Changes

- c4e81fd: Upgrade runtime dependencies to latest versions
- Updated dependencies [c4e81fd]
  - @funkai/models@0.3.1

## 0.6.0

### Minor Changes

- c4af5ab: Add `Resolver` pattern and `evolve()` function for environment-aware agent configuration.

  **Resolver pattern**: Config fields (`model`, `system`, `tools`, `agents`, `maxSteps`, `logger`) now accept `T | ((params: { input }) => T | Promise<T>)` so they resolve dynamically at `.generate()` / `.stream()` time based on validated input.

  **`evolve()` function**: Create a new agent or flow agent from an existing one with config overrides. Scalars (name, model, system, hooks, etc.) are replaced; records (tools, agents) are shallow-merged.

## 0.5.0

### Minor Changes

- c9733c9: Remove `registry` field from `AgentConfig` and `resolveModel()` utility. The `Model` type now only accepts `LanguageModel` instances, and the deprecated `ModelRef` export has been removed. Pass AI SDK provider instances directly (e.g. `openai('gpt-4.1')`) instead of string model IDs with a registry.

## 0.4.1

### Patch Changes

- fc3dec9: Fix sub-agent tool names rejected by OpenAI, Azure, and other providers. Replaced colon separator (`agent:name`) with underscore (`agent_name`) to match the universally safe pattern `^[a-zA-Z_][a-zA-Z0-9_]*$`. Added runtime validation and compile-time `ToolSafeKey` type guard for sub-agent keys.

## 0.4.0

### Minor Changes

- 8b89d9c: Simplify API surface across all packages: replace OpenRouter-specific provider layer with generic registry pattern, streamline agent internals, and restructure prompt entry points.

  Migration notes:

  - `@funkai/agents`: `AgentConfig.resolver` is replaced by `AgentConfig.registry`.
  - `@funkai/models`: OpenRouter-specific provider exports (`openrouter.ts`, `resolver.ts`) were removed in favor of `createProviderRegistry` and `ProviderRegistry`.
  - `@funkai/prompts`: Runtime helpers moved to `@funkai/prompts/runtime`, CLI helpers moved to `@funkai/prompts/cli`.

### Patch Changes

- Updated dependencies [8b89d9c]
  - @funkai/models@0.3.0

## 0.3.0

### Minor Changes

- a7c3354: Add `toTextStreamResponse()` and `toUIMessageStreamResponse()` methods to `StreamResult`, enabling direct HTTP response conversion for API frameworks like Hono, Express, and Bun. Both methods delegate to the underlying Vercel AI SDK `streamText` result. Flow agents throw a descriptive error since they lack a single model stream.

## 0.2.1

### Patch Changes

- 153c393: refactor: deep review cleanup across all packages

  - **@funkai/agents**: Remove dead code (`resolve.ts`, `attempt.ts`), fix stale "Workflow" JSDoc references, deduplicate `buildOnFinishHandler`, complete `writeLog` JSDoc, remove orphaned `ResolveParam` export
  - **@funkai/models**: Export missing `ProviderFactory` and `ProviderMap` types, convert per-provider `*Model()` lookup from O(n) `.find()` to O(1) Map, fix floating-point precision artifacts in generated pricing data
  - **@funkai/prompts**: Rename generic `engine` export to `liquidEngine` for clarity

- Updated dependencies [153c393]
  - @funkai/models@0.2.1

## 0.2.0

### Minor Changes

- 3b4a2ea: Extract @funkai/models package with models.dev catalog, per-provider subpath exports, and configurable model resolver
- 7c2c157: Support void-output flow agents in FlowFactory so engine-powered flows don't require a redundant output schema

### Patch Changes

- 3c13bab: Wrap custom engine steps in $.step() so they participate in the step lifecycle (traces, hooks, duration, error wrapping)
- 9add889: Wire up per-call overrides.onStepFinish in flow agents so it fires alongside config.onStepFinish
- 62459e6: Prevent unhandled promise rejections in agent.stream() and flowAgent.stream() when consumers don't await all derived promises
- dbc4393: Add comprehensive JSDoc documentation to exported functions

  Add JSDoc documentation with @param, @returns, and @example to:

  - createDefaultLogger() with child logger binding examples
  - resolveOutput() (marked @internal) with Zod schema wrapping examples
  - SubAgents type with orchestrator pattern examples

  All examples follow functional programming patterns with immutable data.

- 8dc2393: Extract shared setup into prepareGeneration() and prepareFlowAgent() helpers to deduplicate generate/stream methods
- Updated dependencies [3b4a2ea]
- Updated dependencies [3730fcc]
- Updated dependencies [0cd5ca9]
- Updated dependencies [4273b56]
  - @funkai/models@0.2.0

## 0.1.1

### Patch Changes

- 1beb2d2: Update package README documentation

## 0.1.0

### Minor Changes

- Initial release of `@funkai/agents` — lightweight workflow and agent orchestration framework built on the Vercel AI SDK.

  - `agent()` — Create AI agents with typed input/output, system prompts, and tool integration
  - `tool()` — Define function-calling tools with Zod-validated schemas
  - `workflow()` — Build multi-step workflows with typed I/O and tracked steps via the `$` step builder
  - `createWorkflowEngine()` — Create workflow factories with shared configuration and custom step types
  - `openrouter()` / `createOpenRouter()` — OpenRouter provider integration
  - Result-based error handling — all public methods return `Result<T>` discriminated unions
  - Streaming support for both agents and workflows
  - Step builder (`$`) with `step`, `agent`, `map`, `each`, `reduce`, `while`, `all`, and `race` operations
