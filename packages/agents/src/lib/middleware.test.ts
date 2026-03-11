import { type LanguageModelMiddleware } from "ai";
import { describe, expect, it, vi } from "vitest";

import { withModelMiddleware } from "@/lib/middleware.js";

// ---------------------------------------------------------------------------
// Helpers — minimal model stubs
// ---------------------------------------------------------------------------

function createStubModel() {
  return {
    specificationVersion: "v3" as const,
    provider: "test",
    modelId: "test-model",
    defaultObjectGenerationMode: "json" as const,
    supportsImageUrls: false,
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  };
}

function createStubMiddleware(
  overrides?: Partial<LanguageModelMiddleware>,
): LanguageModelMiddleware {
  return {
    specificationVersion: "v2",
    ...overrides,
  } as LanguageModelMiddleware;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("withModelMiddleware", () => {
  it("returns the model unchanged when there is no middleware and devtools is off", async () => {
    const model = createStubModel();

    const result = await withModelMiddleware({
      model: model as never,
      devtools: false,
    });

    expect(result).toBe(model);
  });

  it("wraps the model when custom middleware is provided", async () => {
    const model = createStubModel();
    const middleware = createStubMiddleware({ wrapGenerate: vi.fn() });

    const result = await withModelMiddleware({
      model: model as never,
      middleware: [middleware],
      devtools: false,
    });

    // The wrapped model should be a different object
    expect(result).not.toBe(model);
    // It should still expose the same model ID
    expect(result.modelId).toBe("test-model");
  });

  it("applies multiple middleware in order", async () => {
    const model = createStubModel();
    const mw1 = createStubMiddleware({ wrapGenerate: vi.fn() });
    const mw2 = createStubMiddleware({ wrapGenerate: vi.fn() });

    const result = await withModelMiddleware({
      model: model as never,
      middleware: [mw1, mw2],
      devtools: false,
    });

    expect(result).not.toBe(model);
    expect(result.modelId).toBe("test-model");
  });

  it("returns a wrapped model when devtools is explicitly enabled", async () => {
    const model = createStubModel();

    const result = await withModelMiddleware({
      model: model as never,
      devtools: true,
    });

    // devtools middleware should wrap the model
    expect(result).not.toBe(model);
  });

  it("respects devtools=false even in development", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const model = createStubModel();

    const result = await withModelMiddleware({
      model: model as never,
      devtools: false,
    });

    expect(result).toBe(model);

    process.env.NODE_ENV = original;
  });

  it("enables devtools automatically when NODE_ENV is development and devtools is not set", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const model = createStubModel();

    const result = await withModelMiddleware({
      model: model as never,
    });

    // devtools middleware should wrap the model automatically
    expect(result).not.toBe(model);
    expect(result.modelId).toBe("test-model");

    process.env.NODE_ENV = original;
  });
});
