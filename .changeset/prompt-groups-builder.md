---
"@funkai/prompts": minor
"@funkai/cli": minor
"@funkai/config": minor
---

feat(prompts): add createPrompt, createPromptGroup, and config-based group assignment

- Add `createPrompt<T>(config)` factory for building prompt modules at runtime and codegen
- Add `createPromptGroup(name, prompts)` for grouping prompt modules into namespaces
- Add `PromptConfig<T>` type for prompt module configuration
- Codegen now uses `createPrompt()` instead of raw object literals
- Scope name uniqueness to group+name instead of global name
- Derive file slugs and import names from group+name to avoid collisions
- Replace `roots` config field with `includes`/`excludes` glob patterns
- Add `groups` config field for pattern-based group assignment via picomatch
- Frontmatter `group` takes precedence over config-defined groups
- Updated banner format for generated files
