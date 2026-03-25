---
"@funkai/agents": patch
---

fix(packages/agents): export createDefaultLogger, fix standards violations, add readonly to event interfaces

- Export `createDefaultLogger` from package entry point (was documented but missing)
- Replace IIFEs in stream() with named `processStream()` functions
- Replace `for...of` loops with `reduce` in hooks and flow steps
- Replace `let` with `const` in `mergeStepHooks` and `buildAgentTool`
- Add `readonly` to `StepInfo`, `StepFinishEvent`, `GenerateResult`, `StepError` fields
- Replace `eslint-disable` with `oxlint-disable` comments on justified `any` usage
