import { describe, expect, it } from "vitest";

import { privateField } from "./private-field.js";

describe("private field accessor", () => {
  describe("get", () => {
    it("returns undefined when field is absent", () => {
      const _field = privateField<string>("test:get-absent");
      expect(_field.get({})).toBeUndefined();
    });

    it("returns the stored value when present", () => {
      const _field = privateField<number>("test:get-present");
      const obj = {};
      _field.set(obj, 42);
      expect(_field.get(obj)).toBe(42);
    });

    it("returns defaultValue when field is absent", () => {
      const _field = privateField<string>("test:get-default-absent");
      expect(_field.get({}, "fallback")).toBe("fallback");
    });

    it("returns the stored value over defaultValue when present", () => {
      const _field = privateField<string>("test:get-default-present");
      const obj = {};
      _field.set(obj, "real");
      expect(_field.get(obj, "fallback")).toBe("real");
    });
  });

  describe("set", () => {
    it("returns the same object reference", () => {
      const _field = privateField<string>("test:set-ref");
      const obj = { a: 1 };
      const result = _field.set(obj, "hello");
      expect(result).toBe(obj);
    });

    it("overwrites a previously set value", () => {
      const _field = privateField<number>("test:set-overwrite");
      const obj = {};
      _field.set(obj, 1);
      _field.set(obj, 2);
      expect(_field.get(obj)).toBe(2);
    });

    it("preserves existing object properties", () => {
      const _field = privateField<string>("test:set-preserve");
      const obj = { visible: true, count: 5 };
      _field.set(obj, "hidden");
      expect(obj.visible).toBe(true);
      expect(obj.count).toBe(5);
    });
  });

  describe("has", () => {
    it("returns false when field is absent", () => {
      const _field = privateField<string>("test:has-absent");
      expect(_field.has({})).toBe(false);
    });

    it("returns true when field is present", () => {
      const _field = privateField<string>("test:has-present");
      const obj = {};
      _field.set(obj, "value");
      expect(_field.has(obj)).toBe(true);
    });
  });

  describe("symbol", () => {
    it("exposes the underlying Symbol", () => {
      const _field = privateField<string>("test:symbol-exposed");
      expect(typeof _field.symbol).toBe("symbol");
    });

    it("uses Symbol.for so same description yields same Symbol", () => {
      const _a = privateField<string>("test:symbol-shared");
      const _b = privateField<string>("test:symbol-shared");
      expect(_a.symbol).toBe(_b.symbol);
    });

    it("can cross-read between accessors with the same description", () => {
      const _writer = privateField<number>("test:symbol-cross");
      const _reader = privateField<number>("test:symbol-cross");
      const obj = {};
      _writer.set(obj, 99);
      expect(_reader.get(obj)).toBe(99);
    });
  });

  describe("invisibility", () => {
    it("is not visible in Object.keys", () => {
      const _field = privateField<string>("test:invis-keys");
      const obj = { visible: true };
      _field.set(obj, "hidden");
      expect(Object.keys(obj)).toEqual(["visible"]);
    });

    it("is not visible in JSON.stringify", () => {
      const _field = privateField<string>("test:invis-json");
      const obj = { visible: true };
      _field.set(obj, "hidden");
      expect(JSON.stringify(obj)).toBe('{"visible":true}');
    });

    it("is not visible in for...in", () => {
      const _field = privateField<string>("test:invis-forin");
      const obj: Record<string, unknown> = { visible: true };
      _field.set(obj, "hidden");
      const keys: string[] = [];
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          keys.push(key);
        }
      }
      expect(keys).toEqual(["visible"]);
    });

    it("does not survive object spread", () => {
      const _field = privateField<string>("test:invis-spread");
      const obj = { visible: true };
      _field.set(obj, "hidden");
      const copy = { ...obj };
      expect(_field.has(copy)).toBe(false);
      expect(_field.get(copy)).toBeUndefined();
    });

    it("is discoverable via Object.getOwnPropertySymbols", () => {
      const _field = privateField<string>("test:invis-symbols");
      const obj = {};
      _field.set(obj, "hidden");
      const symbols = Object.getOwnPropertySymbols(obj);
      expect(symbols).toContain(_field.symbol);
    });
  });

  describe("multiple fields on one object", () => {
    it("supports independent private fields", () => {
      const _name = privateField<string>("test:multi-name");
      const _age = privateField<number>("test:multi-age");
      const obj = {};
      _name.set(obj, "alice");
      _age.set(obj, 30);
      expect(_name.get(obj)).toBe("alice");
      expect(_age.get(obj)).toBe(30);
    });
  });
});
