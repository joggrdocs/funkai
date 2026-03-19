---
"@funkai/agents": patch
"@funkai/cli": minor
---

Enforce TypeScript and FP standards across all packages.

**@funkai/agents**
- `isAgent()` and `isFlowAgent()` now return proper type predicates (`value is Agent` / `value is FlowAgent`) instead of `boolean`
- Added `@example` tags to exported `toJsonSchema`, `isZodObject`, `isZodArray`

**@funkai/cli**
- **Breaking:** `handleGenerate`, `handleLint`, `flattenPartials`, `parseFrontmatter` now accept a single params object instead of positional arguments
- New exported interfaces: `HandleGenerateParams`, `HandleLintParams`, `FlattenPartialsParams`, `ParseFrontmatterParams`
- `extractVariables` and `discoverPrompts` return `readonly` arrays
- `parseSchemaBlock` returns `readonly SchemaVariable[]`
