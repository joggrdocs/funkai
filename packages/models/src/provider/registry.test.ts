import { describe, expect, it, vi } from "vitest";

import { createProviderRegistry } from "@/provider/registry.js";
import type { LanguageModel } from "@/provider/types.js";

function fakeModel(id: string): LanguageModel {
  return { modelId: id } as unknown as LanguageModel;
}

function fakeProvider(prefix: string) {
  return {
    specificationVersion: "v3" as const,
    languageModel: (modelName: string) => fakeModel(`${prefix}/${modelName}`),
    textEmbeddingModel: () => {
      throw new Error("not implemented");
    },
    embeddingModel: () => {
      throw new Error("not implemented");
    },
    imageModel: () => {
      throw new Error("not implemented");
    },
  };
}

describe("createProviderRegistry()", () => {
  it("resolves a model ID via the mapped provider", () => {
    const registry = createProviderRegistry({
      providers: { openai: fakeProvider("openai") },
    });

    const result = registry("openai/gpt-4.1");

    expect(result).toEqual(fakeModel("openai/gpt-4.1"));
  });

  it("supports multiple mapped providers", () => {
    const openai = fakeProvider("openai");
    const anthropic = fakeProvider("anthropic");
    const openaiSpy = vi.spyOn(openai, "languageModel");
    const anthropicSpy = vi.spyOn(anthropic, "languageModel");

    const registry = createProviderRegistry({
      providers: { openai, anthropic },
    });

    registry("openai/gpt-4.1");
    registry("anthropic/claude-sonnet-4-20250514");

    expect(openaiSpy).toHaveBeenCalledWith("gpt-4.1");
    expect(anthropicSpy).toHaveBeenCalledWith("claude-sonnet-4-20250514");
  });

  it("handles model IDs with multiple slashes correctly", () => {
    const registry = createProviderRegistry({
      providers: { "meta-llama": fakeProvider("meta-llama") },
    });

    const result = registry("meta-llama/llama-4-scout/extended");

    expect(result).toEqual(fakeModel("meta-llama/llama-4-scout/extended"));
  });

  it("throws for empty model ID", () => {
    const registry = createProviderRegistry({
      providers: { openai: fakeProvider("openai") },
    });

    expect(() => registry("")).toThrow("Cannot resolve model: model ID is empty");
  });

  it("throws for whitespace-only model ID", () => {
    const registry = createProviderRegistry({
      providers: { openai: fakeProvider("openai") },
    });

    expect(() => registry("   ")).toThrow("Cannot resolve model: model ID is empty");
  });

  it("throws for unmapped provider prefix", () => {
    const registry = createProviderRegistry({
      providers: { openai: fakeProvider("openai") },
    });

    expect(() => registry("anthropic/claude-sonnet-4-20250514")).toThrow();
  });
});
