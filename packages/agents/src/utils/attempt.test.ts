import { describe, expect, it } from "vitest";

import { attemptEach, attemptEachAsync } from "@/utils/attempt.js";

describe("attemptEach", () => {
  it("returns success tuples for handlers that succeed", () => {
    const results = attemptEach(
      () => 1,
      () => 2,
    );
    expect(results).toEqual([
      [null, 1],
      [null, 2],
    ]);
  });

  it("returns error tuples for handlers that throw", () => {
    const results = attemptEach(
      () => {
        throw new Error("boom");
      },
      () => 42,
    );

    expect(results).toHaveLength(2);
    const first = results[0];
    if (first == null) {
      throw new Error("Expected first result to be defined");
    }
    expect(first[0]).toBeInstanceOf(Error);
    expect((first[0] as Error).message).toBe("boom");
    expect(first[1]).toBeNull();
    expect(results[1]).toEqual([null, 42]);
  });

  it("skips undefined handlers", () => {
    const results = attemptEach(
      undefined,
      () => "a",
      undefined,
      () => "b",
      undefined,
    );
    expect(results).toEqual([
      [null, "a"],
      [null, "b"],
    ]);
  });

  it("returns an empty array when all handlers are undefined", () => {
    const results = attemptEach(undefined, undefined);
    expect(results).toEqual([]);
  });

  it("returns an empty array when called with no arguments", () => {
    const results = attemptEach();
    expect(results).toEqual([]);
  });
});

describe("attemptEachAsync", () => {
  it("returns success tuples for async handlers that succeed", async () => {
    const results = await attemptEachAsync(
      async () => "a",
      async () => "b",
    );
    expect(results).toEqual([
      [null, "a"],
      [null, "b"],
    ]);
  });

  it("returns error tuples for async handlers that reject", async () => {
    const results = await attemptEachAsync(
      async () => {
        throw new Error("async boom");
      },
      async () => "ok",
    );

    expect(results).toHaveLength(2);
    const first = results[0];
    if (first == null) {
      throw new Error("Expected first result to be defined");
    }
    expect(first[0]).toBeInstanceOf(Error);
    expect((first[0] as Error).message).toBe("async boom");
    expect(first[1]).toBeNull();
    expect(results[1]).toEqual([null, "ok"]);
  });

  it("handles sync handlers passed to the async variant", async () => {
    const results = await attemptEachAsync(() => "sync");
    expect(results).toEqual([[null, "sync"]]);
  });

  it("skips undefined handlers", async () => {
    const results = await attemptEachAsync(undefined, async () => 1, undefined);
    expect(results).toEqual([[null, 1]]);
  });

  it("returns an empty array when all handlers are undefined", async () => {
    const results = await attemptEachAsync(undefined);
    expect(results).toEqual([]);
  });

  it("returns an empty array when called with no arguments", async () => {
    const results = await attemptEachAsync();
    expect(results).toEqual([]);
  });

  it("executes handlers sequentially", async () => {
    const order: number[] = [];
    await attemptEachAsync(
      async () => {
        order.push(1);
      },
      async () => {
        order.push(2);
      },
      async () => {
        order.push(3);
      },
    );
    expect(order).toEqual([1, 2, 3]);
  });
});
