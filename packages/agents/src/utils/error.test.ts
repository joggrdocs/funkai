import { describe, it, expect } from "vitest";

import { toError, safeStringify, safeStringifyJSON } from "@/utils/error.js";

describe("toError", () => {
  it("returns Error instances as-is", () => {
    const original = new Error("boom");
    const result = toError(original);
    expect(result).toBe(original);
  });

  it("preserves Error subclasses", () => {
    const original = new TypeError("bad type");
    const result = toError(original);
    expect(result).toBe(original);
    expect(result).toBeInstanceOf(TypeError);
  });

  it("wraps a string into an Error", () => {
    const result = toError("raw string");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("raw string");
    expect(result.cause).toBe("raw string");
  });

  it("serializes a plain object as JSON", () => {
    const thrown = { status: 400, message: "sandbox name too long" };
    const result = toError(thrown);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('{"status":400,"message":"sandbox name too long"}');
    expect(result.cause).toBe(thrown);
  });

  it("serializes an array as JSON", () => {
    const thrown = ["error1", "error2"];
    const result = toError(thrown);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('["error1","error2"]');
    expect(result.cause).toBe(thrown);
  });

  it("serializes a Map as entries array", () => {
    const thrown = new Map([["key", "value"]]);
    const result = toError(thrown);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('[["key","value"]]');
    expect(result.cause).toBe(thrown);
  });

  it("serializes a Set as values array", () => {
    const thrown = new Set([1, 2, 3]);
    const result = toError(thrown);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("[1,2,3]");
    expect(result.cause).toBe(thrown);
  });

  it("handles circular references without throwing", () => {
    const thrown: Record<string, unknown> = { name: "circular" };
    thrown.self = thrown;
    const result = toError(thrown);
    expect(result).toBeInstanceOf(Error);
    // Falls back to String() when JSON.stringify throws on circular refs
    expect(result.message).toBe("[object Object]");
    expect(result.cause).toBe(thrown);
  });

  it("handles null", () => {
    const result = toError(null);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("null");
  });

  it("handles undefined", () => {
    const result = toError(undefined);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("undefined");
  });

  it("handles numbers", () => {
    const result = toError(42);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("42");
  });

  it("handles booleans", () => {
    const result = toError(false);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("false");
  });
});

describe("safeStringify", () => {
  it("stringifies a plain object as JSON", () => {
    expect(safeStringify({ status: 400 })).toBe('{"status":400}');
  });

  it("stringifies an array as JSON", () => {
    expect(safeStringify([1, 2, 3])).toBe("[1,2,3]");
  });

  it("stringifies a Map as entries", () => {
    expect(safeStringify(new Map([["k", "v"]]))).toBe('[["k","v"]]');
  });

  it("stringifies a Set as values", () => {
    expect(safeStringify(new Set(["a", "b"]))).toBe('["a","b"]');
  });

  it("stringifies null", () => {
    expect(safeStringify(null)).toBe("null");
  });

  it("stringifies undefined", () => {
    expect(safeStringify(undefined)).toBe("undefined");
  });

  it("stringifies a number", () => {
    expect(safeStringify(42)).toBe("42");
  });

  it("stringifies a boolean", () => {
    expect(safeStringify(true)).toBe("true");
  });

  it("stringifies a string as-is", () => {
    expect(safeStringify("hello")).toBe("hello");
  });

  it("falls back to String() for circular references", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;
    expect(safeStringify(circular)).toBe("[object Object]");
  });
});

describe("safeStringifyJSON", () => {
  it("serializes a plain object", () => {
    expect(safeStringifyJSON({ a: 1, b: "two" })).toBe('{"a":1,"b":"two"}');
  });

  it("serializes an array", () => {
    expect(safeStringifyJSON([1, 2, 3])).toBe("[1,2,3]");
  });

  it("serializes a Map as entries", () => {
    expect(safeStringifyJSON(new Map([["k", "v"]]))).toBe('[["k","v"]]');
  });

  it("serializes a Set as values", () => {
    expect(safeStringifyJSON(new Set(["a", "b"]))).toBe('["a","b"]');
  });

  it("serializes a string", () => {
    expect(safeStringifyJSON("hello")).toBe('"hello"');
  });

  it("serializes null", () => {
    expect(safeStringifyJSON(null)).toBe("null");
  });

  it("serializes a number", () => {
    expect(safeStringifyJSON(42)).toBe("42");
  });

  it("returns empty string for circular references", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;
    expect(safeStringifyJSON(circular)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(safeStringifyJSON(undefined)).toBe("");
  });

  it("returns empty string for functions", () => {
    expect(safeStringifyJSON(() => "nope")).toBe("");
  });
});
