# FunkAI Composability Plan

## Goals

1. Break `@funkai/agents` into composable packages
2. Introduce `flowAgent` as a first-class agent type (replaces `workflow`)
3. Make `flowAgent` API identical to `agent` for consumers
4. Model flow steps as tool calls so `messages` and streaming "just work"
5. Make model resolution pluggable (no hardcoded OpenRouter)
6. Create `funkai` root meta-package for batteries-included installs

## Package Structure (After)

```text
packages/
  agents/        @funkai/agents     - core: agent(), flowAgent(), tool(), Result, types
  models/        @funkai/models     - model catalog + pricing metadata
  openrouter/    @funkai/openrouter - OpenRouter provider integration
  testing/       @funkai/testing    - mock utilities
  prompts/       @funkai/prompts    - already exists (unchanged)
  funkai/        funkai             - root meta-package re-exporting all
```

## Plan Documents

| File                         | Topic                                                     |
| ---------------------------- | --------------------------------------------------------- |
| `01-packages.md`             | Package split details + dependency graph                  |
| `02-flow-agent.md`           | `flowAgent()` API design + steps-as-tool-calls            |
| `03-streaming.md`            | Streaming architecture for flowAgent                      |
| `04-model-resolution.md`     | Pluggable model resolution (remove OpenRouter hardcoding) |
| `05-migration.md`            | Migration path from current `workflow()` API              |
| `06-implementation-order.md` | Ordered implementation phases                             |
