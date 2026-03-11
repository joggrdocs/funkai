import { Liquid } from "liquidjs";
import { describe, expect, it } from "vitest";

import { createEngine, engine } from "@/engine.js";

describe("createEngine", () => {
  it("should return a Liquid instance", () => {
    const eng = createEngine("/tmp/test-partials");
    expect(eng).toBeInstanceOf(Liquid);
  });

  it("should render basic variable expressions", () => {
    const eng = createEngine("/tmp/test-partials");
    const result = eng.parseAndRenderSync("Hello {{ name }}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("should merge custom options with defaults", () => {
    const eng = createEngine("/tmp/test-partials", {
      cache: false,
      strictFilters: false,
    });
    // Should not throw on unknown filter when strictFilters is disabled
    const result = eng.parseAndRenderSync("{{ name | nonexistent }}", { name: "test" });
    expect(result).toBe("test");
  });
});

describe("engine", () => {
  it("should be a Liquid instance", () => {
    expect(engine).toBeInstanceOf(Liquid);
  });

  it("should render variable expressions", () => {
    const result = engine.parseAndRenderSync("Hello {{ name }}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("should throw on unknown filters (strictFilters)", () => {
    expect(() => {
      engine.parseAndRenderSync("{{ name | bogus }}", { name: "test" });
    }).toThrow();
  });
});
