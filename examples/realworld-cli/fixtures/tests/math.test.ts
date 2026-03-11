import { describe, it, expect } from "vitest";

import { add, subtract, divide } from "../src/math.js";

// BAD: No assertion — calls function but never checks result
describe("add", () => {
  it("", () => {
    add(1, 2);
  });

  // BAD: Hardcoded wrong expected value
  it("adds large numbers", () => {
    expect(add(1000, 2000)).toBe(2999);
  });
});

// BAD: Missing description on describe block
describe("", () => {
  it("subtracts", () => {
    expect(subtract(5, 3)).toBe(2);
  });
  // BAD: Missing edge cases — no tests for negative results, zero
});

// BAD: No tests for divide-by-zero error path
describe("divide", () => {
  it("divides two numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });
});

// BAD: No tests at all for factorial
// BAD: No edge case tests for factorial(0), factorial(1), negative input
