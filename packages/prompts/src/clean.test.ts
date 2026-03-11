import { describe, expect, it } from "vitest";

import { clean } from "@/clean.js";

describe("clean", () => {
  it("should strip YAML frontmatter from a prompt file", () => {
    const input = "---\nname: test-prompt\ngroup: agents\n---\nHello {{ name }}";
    expect(clean(input)).toBe("Hello {{ name }}");
  });

  it("should return the string unchanged when no frontmatter is present", () => {
    const input = "Hello {{ name }}";
    expect(clean(input)).toBe("Hello {{ name }}");
  });

  it("should handle Windows-style line endings", () => {
    const input = "---\r\nname: test\r\n---\r\nHello {{ name }}";
    expect(clean(input)).toBe("Hello {{ name }}");
  });

  it("should handle frontmatter with no trailing newline after closing delimiter", () => {
    const input = "---\nname: test\n---";
    expect(clean(input)).toBe("");
  });

  it("should return an empty string when input is empty", () => {
    expect(clean("")).toBe("");
  });

  it("should preserve multiline template body after frontmatter", () => {
    const input = [
      "---",
      "name: multi-line",
      "schema:",
      "  name: string",
      "  age: number",
      "---",
      "Line 1",
      "Line 2",
      "{{ variable }}",
    ].join("\n");
    expect(clean(input)).toBe("Line 1\nLine 2\n{{ variable }}");
  });
});
