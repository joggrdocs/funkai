import { describe, expect, it } from "vitest";
import { z } from "zod";

import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";

// ---------------------------------------------------------------------------
// RUNNABLE_META symbol
// ---------------------------------------------------------------------------

describe("RUNNABLE_META", () => {
  it("is a symbol", () => {
    expect(typeof RUNNABLE_META).toBe("symbol");
  });

  it("is globally registered via Symbol.for", () => {
    expect(RUNNABLE_META).toBe(Symbol.for("agent-sdk:runnable-meta"));
  });

  it("can be used as a property key on plain objects", () => {
    const meta: RunnableMeta = { name: "test-agent" };
    const obj: Record<symbol, RunnableMeta> = { [RUNNABLE_META]: meta };
    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
    expect(obj[RUNNABLE_META]).toBe(meta);
  });

  it("stores name and inputSchema", () => {
    const schema = z.object({ query: z.string() });
    const meta: RunnableMeta = { name: "search-agent", inputSchema: schema };
    const obj: Record<symbol, RunnableMeta> = { [RUNNABLE_META]: meta };

    // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
    const stored = obj[RUNNABLE_META] as RunnableMeta;
    expect(stored.name).toBe("search-agent");
    expect(stored.inputSchema).toBe(schema);
  });

  it("allows inputSchema to be omitted", () => {
    const meta: RunnableMeta = { name: "simple-agent" };
    expect(meta.inputSchema).toBeUndefined();
  });
});
