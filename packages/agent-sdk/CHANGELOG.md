# @pkg/agent-sdk

## 0.4.0

## 0.3.0

### Patch Changes

- [#259](https://github.com/joggrdocs/serenity/pull/259) [`033aee5`](https://github.com/joggrdocs/serenity/commit/033aee5c9197811719ca896ef474befba218f220) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Refactor code-analysis v2 workflow to use the core orchestrator agent instead of a standalone analyzer agent. The core agent receives the analyzer system prompt as context and delegates to sub-agents (explorer, planner, worker, verifier) for deep codebase analysis. Fix tool propagation so sub-agents receive sandbox filesystem tools. Remove redundant workflow-level verification (core agent handles it internally). Migrate v2 workflow to `@pkg/sandbox` API. Hotswap v2 into v1 export for e2e testing.

## 0.2.1

## 0.2.0

### Minor Changes

- [#249](https://github.com/joggrdocs/serenity/pull/249) [`8664fd5`](https://github.com/joggrdocs/serenity/commit/8664fd5625f8b0a30158511bfb6a0138e46b1678) Thanks [@srosenbauer](https://github.com/srosenbauer)! - switch code-analysis workflow from legacy sandbox client to mcp-based client with tool whitelist, fixing context window overflow on large repositories. enhance agent sdk `onStepFinish` hook to surface tool call names, arg/result sizes, and per-step token usage.

### Patch Changes

- [#215](https://github.com/joggrdocs/serenity/pull/215) [`8e455b1`](https://github.com/joggrdocs/serenity/commit/8e455b1f09942fd0397dcfa5ff3ea5ee505e4925) Thanks [@srosenbauer](https://github.com/srosenbauer)! - Replace ternary expressions with `ts-pattern` `match()` to fix `no-ternary` lint errors.

- [#247](https://github.com/joggrdocs/serenity/pull/247) [`2fb592d`](https://github.com/joggrdocs/serenity/commit/2fb592d4833c4d96def8e05d06c777d0d97b06f2) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Minor and pre-1.0 dependency upgrades: @blaxel/core 0.2.70, @openrouter/sdk 0.9.11, lucide-react 0.576.0, oxlint 1.51.0, oxfmt 0.36.0, knip 5.85.0, vercel 50.26.0, @statsig/\* 3.32.0, @tabler/icons-react 3.38.0, and others.

- [#241](https://github.com/joggrdocs/serenity/pull/241) [`67e6fa2`](https://github.com/joggrdocs/serenity/commit/67e6fa21aed985f336a728bf390f0a94eacbedb8) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Upgrade es-toolkit from 1.44.0 to 1.45.0 across all dependents.

## 0.1.3

## 0.1.2

## 0.1.1

### Patch Changes

- [#200](https://github.com/joggrdocs/serenity/pull/200) [`e5bbfd8`](https://github.com/joggrdocs/serenity/commit/e5bbfd8e46b5d9884904367d33cd85b51e0a5f1d) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Fix sandbox name generation to comply with Blaxel's 49-char limit
