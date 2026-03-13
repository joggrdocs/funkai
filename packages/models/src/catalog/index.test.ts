import { describe, expect, it } from "vitest";

import { model, models, MODELS } from "@/catalog/index.js";

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
      expect(typeof m.provider).toBe("string");
      expect(typeof m.pricing.input).toBe("number");
      expect(typeof m.pricing.output).toBe("number");
      expect(Array.isArray(m.modalities.input)).toBe(true);
      expect(Array.isArray(m.modalities.output)).toBe(true);
      expect(typeof m.capabilities.reasoning).toBe("boolean");
    }
  });

  it("contains known model IDs", () => {
    const ids = MODELS.map((m) => m.id);
    expect(ids).toContain("gpt-4o-mini");
    expect(ids).toContain("o1");
  });

  it("has no duplicate IDs within the same provider", () => {
    const seen = new Map<string, Set<string>>();
    for (const m of MODELS) {
      const providerSet = seen.get(m.provider) ?? new Set<string>();
      expect(providerSet.has(m.id)).toBe(false);
      providerSet.add(m.id);
      seen.set(m.provider, providerSet);
    }
  });
});

// ---------------------------------------------------------------------------
// model()
// ---------------------------------------------------------------------------

describe("model()", () => {
  it("returns the model definition for a known ID", () => {
    const result = model("gpt-4o-mini");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("gpt-4o-mini");
    expect(result!.provider).toBe("openai");
    expect(typeof result!.pricing.input).toBe("number");
    expect(typeof result!.pricing.output).toBe("number");
  });

  it("returns null for an unknown model ID", () => {
    const result = model("nonexistent-model-99");

    expect(result).toBeNull();
  });

  it("returns model with reasoning capability", () => {
    const result = model("o1");

    expect(result).not.toBeNull();
    expect(result!.capabilities.reasoning).toBe(true);
  });

  it("returns model with correct modalities", () => {
    const result = model("gpt-4o-mini");

    expect(result).not.toBeNull();
    expect(result!.modalities.input).toContain("text");
    expect(result!.modalities.output).toContain("text");
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

  it("filters models by capability", () => {
    const reasoningModels = models((m) => m.capabilities.reasoning);

    expect(reasoningModels.length).toBeGreaterThan(0);
    for (const m of reasoningModels) {
      expect(m.capabilities.reasoning).toBe(true);
    }
  });

  it("filters models by modality", () => {
    const imageModels = models((m) => m.modalities.input.includes("image"));

    expect(imageModels.length).toBeGreaterThan(0);
    for (const m of imageModels) {
      expect(m.modalities.input).toContain("image");
    }
  });

  it("returns empty array when filter matches nothing", () => {
    const result = models(() => false);

    expect(result).toEqual([]);
  });

  it("supports arbitrary filter predicates", () => {
    const result = models((m) => m.pricing.input > 0.000001);

    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.pricing.input).toBeGreaterThan(0.000001);
    }
  });
});
