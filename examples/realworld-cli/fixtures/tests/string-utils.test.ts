import { describe, it, expect } from "vitest";

import { capitalize, truncate } from "../src/string-utils.js";

// BAD: Vague descriptions, missing edge cases
describe("capitalize", () => {
  it("works", () => {
    expect(capitalize("hello")).toBe("Hello");
  });
  // BAD: Missing edge cases — empty string, single char, already capitalized, unicode
});

describe("truncate", () => {
  // BAD: No assertion
  it("truncates", () => {
    truncate("hello world this is a long string", 10);
  });

  // BAD: Wrong expected value — should be "abc..." not "abc"
  it("adds ellipsis", () => {
    expect(truncate("abcdef", 3)).toBe("abc");
  });
});

// BAD: Missing tests for isValidEmail entirely
// BAD: Missing tests for slugify entirely

// BAD: Redundant test — tests same thing as first capitalize test
describe("capitalize again", () => {
  it("capitalizes", () => {
    expect(capitalize("world")).toBe("World");
  });
});
