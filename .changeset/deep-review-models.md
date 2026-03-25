---
"@funkai/models": patch
---

docs(packages/models): document reasoning token semantics, cost precision, and registry error modes

- Document that `reasoningTokens` must be exclusive of `outputTokens` to avoid double-counting
- Add floating-point imprecision note to `UsageCost` interface
- Add `@throws` documentation to `createProviderRegistry` resolve function
- Add `SAFETY` comment explaining double `as` cast in provider resolution
- Fix file structure: move private `errorMessage` helper after exports
