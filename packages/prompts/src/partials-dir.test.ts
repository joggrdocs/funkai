import { isAbsolute } from "node:path";

import { describe, expect, it } from "vitest";

import { PARTIALS_DIR } from "@/partials-dir.js";

describe("PARTIALS_DIR", () => {
  it("should be an absolute path", () => {
    expect(isAbsolute(PARTIALS_DIR)).toBe(true);
  });

  it("should point to the prompts directory", () => {
    expect(PARTIALS_DIR).toMatch(/prompts$/);
  });
});
