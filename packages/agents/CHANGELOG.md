# @funkai/agents

## 0.2.0

### Minor Changes

- 3b4a2ea: Extract @funkai/models package with models.dev catalog, per-provider subpath exports, and configurable model resolver

### Patch Changes

- 62459e6: Prevent unhandled promise rejections in agent.stream() and flowAgent.stream() when consumers don't await all derived promises
- dbc4393: Add comprehensive JSDoc documentation to exported functions

  Add JSDoc documentation with @param, @returns, and @example to:

  - createDefaultLogger() with child logger binding examples
  - resolveOutput() (marked @internal) with Zod schema wrapping examples
  - SubAgents type with orchestrator pattern examples

  All examples follow functional programming patterns with immutable data.

- Updated dependencies [3b4a2ea]
- Updated dependencies [3730fcc]
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
