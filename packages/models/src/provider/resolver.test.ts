import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LanguageModel } from "@/provider/types.js";

// Mock the openrouter module so resolver fallback doesn't need a real API key
const mockOpenRouter = vi.fn();
vi.mock("@/provider/openrouter.js", () => ({
  openrouter: mockOpenRouter,
}));

const { createModelResolver } = await import("@/provider/resolver.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeModel(id: string): LanguageModel {
  return { modelId: id } as unknown as LanguageModel;
}

function fakeFactory(prefix: string): (modelName: string) => LanguageModel {
  return (modelName: string) => fakeModel(`${prefix}/${modelName}`);
}

// ---------------------------------------------------------------------------
// createModelResolver()
// ---------------------------------------------------------------------------

describe("createModelResolver()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenRouter.mockImplementation((id: string) => fakeModel(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to openrouter when no providers are configured", () => {
    const resolve = createModelResolver();
    const result = resolve("openai/gpt-4.1");

    expect(mockOpenRouter).toHaveBeenCalledWith("openai/gpt-4.1");
    expect(result).toEqual(fakeModel("openai/gpt-4.1"));
  });

  it("uses a mapped provider when prefix matches", () => {
    const openaiFactory = vi.fn(fakeFactory("openai"));
    const resolve = createModelResolver({
      providers: { openai: openaiFactory },
    });

    const result = resolve("openai/gpt-4.1");

    expect(openaiFactory).toHaveBeenCalledWith("gpt-4.1");
    expect(mockOpenRouter).not.toHaveBeenCalled();
    expect(result).toEqual(fakeModel("openai/gpt-4.1"));
  });

  it("falls back to openrouter for unmapped prefixes", () => {
    const resolve = createModelResolver({
      providers: { openai: fakeFactory("openai") },
    });

    resolve("anthropic/claude-sonnet-4-20250514");

    expect(mockOpenRouter).toHaveBeenCalledWith("anthropic/claude-sonnet-4-20250514");
  });

  it("handles model IDs without a slash via openrouter fallback", () => {
    const resolve = createModelResolver();

    resolve("gpt-4.1");

    expect(mockOpenRouter).toHaveBeenCalledWith("gpt-4.1");
  });

  it("throws for model IDs without a slash when fallback is disabled", () => {
    const resolve = createModelResolver({ fallbackToOpenRouter: false });

    expect(() => resolve("gpt-4.1")).toThrow(
      'Cannot resolve model "gpt-4.1": no provider prefix and OpenRouter fallback is disabled',
    );
  });

  it("throws for unmapped prefixes when fallback is disabled", () => {
    const resolve = createModelResolver({
      providers: { openai: fakeFactory("openai") },
      fallbackToOpenRouter: false,
    });

    expect(() => resolve("anthropic/claude-sonnet-4-20250514")).toThrow(
      'Cannot resolve model "anthropic/claude-sonnet-4-20250514": no provider mapped for "anthropic" and OpenRouter fallback is disabled',
    );
  });

  it("supports multiple mapped providers", () => {
    const openaiFactory = vi.fn(fakeFactory("openai"));
    const anthropicFactory = vi.fn(fakeFactory("anthropic"));

    const resolve = createModelResolver({
      providers: {
        openai: openaiFactory,
        anthropic: anthropicFactory,
      },
    });

    resolve("openai/gpt-4.1");
    resolve("anthropic/claude-sonnet-4-20250514");

    expect(openaiFactory).toHaveBeenCalledWith("gpt-4.1");
    expect(anthropicFactory).toHaveBeenCalledWith("claude-sonnet-4-20250514");
    expect(mockOpenRouter).not.toHaveBeenCalled();
  });

  it("handles model IDs with multiple slashes correctly", () => {
    const resolve = createModelResolver({
      providers: { "meta-llama": fakeFactory("meta-llama") },
    });

    resolve("meta-llama/llama-4-scout/extended");

    expect(resolve("meta-llama/llama-4-scout/extended")).toEqual(
      fakeModel("meta-llama/llama-4-scout/extended"),
    );
  });
});
