---
"@funkai/agents": patch
---

Fix type safety issues in agent lifecycle hooks and flow engine

- Remove unsafe generic hook forwarding from parent agents to sub-agents — only fixed-type hooks (`onStepStart`, `onStepFinish`) are forwarded; generic hooks (`onStart`, `onFinish`, `onError`) stay at the parent level where their `TInput`/`TOutput` types are correct
- Wrap `buildMergedHook` in `fireHooks` for error protection — merged hooks now swallow errors like all other hooks
- Fix config spread ordering in flow agent steps — framework fields (`input`, `signal`, `logger`) can no longer be overwritten by user config
- Thread `TOutput` through `BaseGenerateParams` so `onFinish` hooks receive `GenerateResult<TOutput>` instead of untyped `GenerateResult`
- Fix `AnyHook` contravariance in flow engine — use properly documented `any` escape hatch for internal hook merging
