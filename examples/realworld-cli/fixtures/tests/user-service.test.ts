import { describe, it, expect } from "vitest";

import { createUser, findUser } from "../src/user-service.js";

// BAD: Tests implementation details — relies on specific UUID format
describe("createUser", () => {
  it("creates a user with a UUID", () => {
    const user = createUser("Alice", "alice@example.com");
    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  // BAD: Tests implementation detail — checks internal Date construction
  it("sets createdAt to now", () => {
    const before = new Date();
    const user = createUser("Bob", "bob@example.com");
    const after = new Date();
    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// BAD: No tests for findUser with non-existent ID
// BAD: No tests for findUserByEmail
// BAD: No tests for deleteUser with non-existent ID
describe("findUser", () => {
  it("finds a user", () => {
    const user = createUser("Charlie", "charlie@example.com");
    const found = findUser(user.id);
    expect(found).toBeDefined();
  });
});

// BAD: Missing — no tests for empty string inputs, email validation edge cases
