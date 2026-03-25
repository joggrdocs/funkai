---
"@funkai/prompts": patch
---

fix(packages/prompts): enable strictVariables, fix deepFreeze mutation, add @throws docs

- Add `strictVariables: true` to shared liquid engine — template/schema mismatches now throw instead of silently rendering empty strings
- Fix `deepFreeze` to shallow-copy nested namespace objects before freezing (previously mutated caller references)
- Replace `for...of` loop in `deepFreeze` with `Object.entries().reduce()`
- Add `@throws {ZodError}` documentation to `render()` and `validate()` methods
