---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Testing Rules

## Always

- Use Vitest (`describe`, `it`, `expect`) — not Jest or other frameworks.
- Co-locate test files with source (`format.test.ts` next to `format.ts`).
- Describe blocks: feature/function name. Test cases: `it('should ...')`.
- `vi.clearAllMocks()` in `beforeEach` when using mocks.
- Test behavior/outcomes, not implementation details.
- Use `vi.mock()` for external services and dependencies.

## Never

- Skip tests without a documented reason.
- Test framework internals — trust dependencies.
- Share mutable state between tests — reset in `beforeEach`.
