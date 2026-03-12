import { Output } from "ai";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { resolveOutput } from "@/core/agents/base/output.js";

const mockIsZodArray = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => boolean>((...args: unknown[]) => {
    const { z: zod } = require("zod");
    // Default: use real JSON schema check
    try {
      return zod.toJSONSchema(args[0]).type === "array";
    } catch {
      return false;
    }
  }),
);

vi.mock("@/utils/zod.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/utils/zod.js")>();
  return {
    ...original,
    isZodArray: (...args: unknown[]) => mockIsZodArray(...args),
  };
});

describe("resolveOutput", () => {
  it("passes through Output.text()", () => {
    const text = Output.text();
    expect(resolveOutput(text)).toBe(text);
  });

  it("passes through Output.object()", () => {
    const obj = Output.object({ schema: z.object({ x: z.number() }) });
    expect(resolveOutput(obj)).toBe(obj);
  });

  it("passes through Output.array()", () => {
    const arr = Output.array({ element: z.object({ x: z.number() }) });
    expect(resolveOutput(arr)).toBe(arr);
  });

  it("passes through Output.choice()", () => {
    const choice = Output.choice({ options: ["a", "b"] as const });
    expect(resolveOutput(choice)).toBe(choice);
  });

  it("passes through Output.json()", () => {
    const json = Output.json();
    expect(resolveOutput(json)).toBe(json);
  });

  it("wraps a Zod object schema in Output.object()", () => {
    const schema = z.object({ name: z.string() });
    const resolved = resolveOutput(schema);

    expect(resolved).not.toBe(schema);
    expect(resolved).toHaveProperty("parseCompleteOutput");
    expect(resolved).toHaveProperty("parsePartialOutput");
    expect(resolved.name).toBe("object");
  });

  it("wraps a Zod array schema in Output.array()", () => {
    const schema = z.array(z.object({ name: z.string() }));
    const resolved = resolveOutput(schema);

    expect(resolved).not.toBe(schema);
    expect(resolved).toHaveProperty("parseCompleteOutput");
    expect(resolved).toHaveProperty("parsePartialOutput");
    expect(resolved.name).toBe("array");
  });

  it("wraps a non-array Zod schema in Output.object()", () => {
    const schema = z.string();
    const resolved = resolveOutput(schema);

    expect(resolved).not.toBe(schema);
    expect(resolved).toHaveProperty("parseCompleteOutput");
    expect(resolved.name).toBe("object");
  });

  it("throws when Zod array element schema cannot be extracted", () => {
    // Force isZodArray to return true for our fake object
    mockIsZodArray.mockReturnValueOnce(true);

    // Create an object that looks like a Zod array but has no extractable element
    const fakeArraySchema = { _zod: { def: {} } };

    expect(() => resolveOutput(fakeArraySchema as never)).toThrow(
      "Failed to extract element schema from Zod array",
    );
  });
});
