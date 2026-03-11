import { describe, expect, it } from "vitest";

import { resolve } from "@/utils/resolve.js";

describe("resolve", () => {
  it("returns a static value as-is", async () => {
    const result = await resolve("hello", {});
    expect(result).toBe("hello");
  });

  it("returns undefined when value is undefined", async () => {
    const result = await resolve(undefined, {});
    expect(result).toBeUndefined();
  });

  it("calls a sync function with ctx and returns the result", async () => {
    const result = await resolve((ctx: { name: string }) => `hi ${ctx.name}`, { name: "Ada" });
    expect(result).toBe("hi Ada");
  });

  it("calls an async function with ctx and returns the resolved result", async () => {
    const result = await resolve(async (ctx: { n: number }) => ctx.n * 2, { n: 21 });
    expect(result).toBe(42);
  });

  it("returns static non-string values (number, object)", async () => {
    expect(await resolve(42, {})).toBe(42);
    expect(await resolve({ key: "value" }, {})).toEqual({ key: "value" });
  });

  it("propagates errors from the resolver function", async () => {
    await expect(
      resolve(() => {
        throw new Error("resolver boom");
      }, {}),
    ).rejects.toThrow("resolver boom");
  });
});
