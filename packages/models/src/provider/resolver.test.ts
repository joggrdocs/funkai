import { describe, expect, it, vi } from "vitest";

import { createModelResolver } from "@/provider/resolver.js";
import type { LanguageModel } from "@/provider/types.js";

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
  it("throws when no providers or fallback are configured for prefixed ID", () => {
    const resolve = createModelResolver();

    expect(() => resolve("openai/gpt-4.1")).toThrow(
      'Cannot resolve model "openai/gpt-4.1": no provider mapped for "openai" and no fallback configured',
    );
  });

  it("throws when no providers or fallback are configured for unprefixed ID", () => {
    const resolve = createModelResolver();

    expect(() => resolve("gpt-4.1")).toThrow(
      'Cannot resolve model "gpt-4.1": no provider prefix and no fallback configured',
    );
  });

  it("uses a mapped provider when prefix matches", () => {
    const openaiFactory = vi.fn(fakeFactory("openai"));
    const resolve = createModelResolver({
      providers: { openai: openaiFactory },
    });

    const result = resolve("openai/gpt-4.1");

    expect(openaiFactory).toHaveBeenCalledWith("gpt-4.1");
    expect(result).toEqual(fakeModel("openai/gpt-4.1"));
  });

  it("falls back to fallback for unmapped prefixes", () => {
    const fallback = vi.fn((id: string) => fakeModel(id));
    const resolve = createModelResolver({
      providers: { openai: fakeFactory("openai") },
      fallback,
    });

    resolve("anthropic/claude-sonnet-4-20250514");

    expect(fallback).toHaveBeenCalledWith("anthropic/claude-sonnet-4-20250514");
  });

  it("handles model IDs without a slash via fallback", () => {
    const fallback = vi.fn((id: string) => fakeModel(id));
    const resolve = createModelResolver({ fallback });

    resolve("gpt-4.1");

    expect(fallback).toHaveBeenCalledWith("gpt-4.1");
  });

  it("throws for unmapped prefixes when no fallback is configured", () => {
    const resolve = createModelResolver({
      providers: { openai: fakeFactory("openai") },
    });

    expect(() => resolve("anthropic/claude-sonnet-4-20250514")).toThrow(
      'Cannot resolve model "anthropic/claude-sonnet-4-20250514": no provider mapped for "anthropic" and no fallback configured',
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

  it("throws for empty model ID", () => {
    const resolve = createModelResolver();

    expect(() => resolve("")).toThrow("Cannot resolve model: model ID is empty");
  });

  it("throws for whitespace-only model ID", () => {
    const resolve = createModelResolver();

    expect(() => resolve("   ")).toThrow("Cannot resolve model: model ID is empty");
  });

  it("prefers mapped provider over fallback", () => {
    const openaiFactory = vi.fn(fakeFactory("openai"));
    const fallback = vi.fn((id: string) => fakeModel(id));

    const resolve = createModelResolver({
      providers: { openai: openaiFactory },
      fallback,
    });

    resolve("openai/gpt-4.1");

    expect(openaiFactory).toHaveBeenCalledWith("gpt-4.1");
    expect(fallback).not.toHaveBeenCalled();
  });
});
