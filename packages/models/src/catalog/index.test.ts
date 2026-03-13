import { describe, expect, it } from "vitest";

import { model, models, MODELS, tryModel } from "@/catalog/index.js";

// ---------------------------------------------------------------------------
// MODELS constant
// ---------------------------------------------------------------------------

describe("MODELS", () => {
  it("is a non-empty array", () => {
    expect(MODELS.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const m of MODELS) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(["chat", "coding", "reasoning"]).toContain(m.category);
      expect(typeof m.pricing.prompt).toBe("number");
      expect(typeof m.pricing.completion).toBe("number");
    }
  });

  it("contains known model IDs", () => {
    const ids = MODELS.map((m) => m.id);
    expect(ids).toContain("openai/gpt-5.2-codex");
    expect(ids).toContain("openai/o4-mini");
  });

  it("has no duplicate IDs", () => {
    const ids = MODELS.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// model()
// ---------------------------------------------------------------------------

describe("model()", () => {
  it("returns the model definition for a known ID", () => {
    const result = model("openai/gpt-5.2-codex");

    expect(result.id).toBe("openai/gpt-5.2-codex");
    expect(result.category).toBe("coding");
    expect(typeof result.pricing.prompt).toBe("number");
    expect(typeof result.pricing.completion).toBe("number");
  });

  it("throws for an unknown model ID", () => {
    expect(() => model("nonexistent/model-99")).toThrow("Unknown model: nonexistent/model-99");
  });

  it("returns correct category for reasoning models", () => {
    const result = model("openai/o3");

    expect(result.category).toBe("reasoning");
  });

  it("returns correct category for chat models", () => {
    const result = model("openai/gpt-5.2");

    expect(result.category).toBe("chat");
  });
});

// ---------------------------------------------------------------------------
// tryModel()
// ---------------------------------------------------------------------------

describe("tryModel()", () => {
  it("returns the model definition for a known ID", () => {
    const result = tryModel("openai/gpt-5.2-codex");

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected result to be defined");
    }
    expect(result.id).toBe("openai/gpt-5.2-codex");
  });

  it("returns undefined for an unknown model ID", () => {
    const result = tryModel("nonexistent/model-99");

    expect(result).toBeUndefined();
  });

  it("does not throw for unknown IDs", () => {
    expect(() => tryModel("nonexistent/model-99")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// models()
// ---------------------------------------------------------------------------

describe("models()", () => {
  it("returns all models when called without filter", () => {
    const result = models();

    expect(result.length).toBe(MODELS.length);
  });

  it("filters models by category", () => {
    const codingModels = models((m) => m.category === "coding");

    expect(codingModels.length).toBeGreaterThan(0);
    for (const m of codingModels) {
      expect(m.category).toBe("coding");
    }
  });

  it("returns reasoning models when filtered", () => {
    const reasoningModels = models((m) => m.category === "reasoning");

    expect(reasoningModels.length).toBeGreaterThan(0);
    for (const m of reasoningModels) {
      expect(m.category).toBe("reasoning");
    }
  });

  it("returns empty array when filter matches nothing", () => {
    const result = models(() => false);

    expect(result).toEqual([]);
  });

  it("supports arbitrary filter predicates", () => {
    const result = models((m) => m.pricing.prompt > 0.000001);

    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.pricing.prompt).toBeGreaterThan(0.000001);
    }
  });
});
