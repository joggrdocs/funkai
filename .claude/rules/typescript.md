---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Rules

## Always

- ts-pattern `match()` for 2+ conditional branches; ternary for single booleans.
- Search [es-toolkit](https://es-toolkit.slash.page/) before writing any utility function; use named imports.
- `const` exclusively — use functional patterns for iteration (`Array.reduce`, `for...of` with local `const` array + `.push()`, `match()` expressions).
- Named functions — extract logic, compose with `flow`, `pipe`, or direct calls.
- Plain objects, interfaces, factory functions, closures. Exception: instantiating framework classes (e.g., from `ai` SDK).
- JSDoc with `@param`, `@returns`, `@example` on all exports.
- Discriminated unions and exhaustive matching for type safety.
- `readonly` and `as const` for immutable data.
- Zod schemas for runtime validation at system boundaries.

## Never

- `let` — use `const` with functional patterns.
- `class` — exception: instantiating framework classes (Vercel AI SDK, etc.).
- `switch` — use ts-pattern `match()`.
- Nested ternaries — use `match()` for 2+ branches.
- IIFEs — extract to named functions.
- Mutate function arguments or shared state.
- `any` type — use `unknown` and narrow appropriately.
