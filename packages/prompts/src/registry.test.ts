import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createPrompt } from "@/prompt.js";
import { createPromptRegistry } from "@/registry.js";

const mockPrompt = createPrompt({
  name: "test-prompt",
  group: "agents",
  template: "Hello {{ name }}",
  schema: z.object({ name: z.string() }),
});

const emptyPrompt = createPrompt({
  name: "empty",
  template: "static",
  schema: z.object({}),
});

describe(createPromptRegistry, () => {
  it("should provide dot-access to a registered prompt", () => {
    const registry = createPromptRegistry({ testPrompt: mockPrompt });
    expect(registry.testPrompt.name).toBe("test-prompt");
    expect(registry.testPrompt.render({ name: "Alice" })).toBe("Hello Alice");
  });

  it("should provide nested dot-access for grouped prompts", () => {
    const registry = createPromptRegistry({
      agents: { testPrompt: mockPrompt },
    });
    expect(registry.agents.testPrompt.name).toBe("test-prompt");
    expect(registry.agents.testPrompt.render({ name: "Bob" })).toBe("Hello Bob");
  });

  it("should freeze the top-level registry object", () => {
    const registry = createPromptRegistry({ testPrompt: mockPrompt });
    expect(Object.isFrozen(registry)).toBeTruthy();
  });

  it("should freeze nested namespace objects", () => {
    const registry = createPromptRegistry({
      agents: { testPrompt: mockPrompt },
    });
    expect(Object.isFrozen(registry.agents)).toBeTruthy();
  });

  it("should expose all keys via Object.keys", () => {
    const registry = createPromptRegistry({
      testPrompt: mockPrompt,
      empty: emptyPrompt,
    });
    expect(Object.keys(registry)).toEqual(["testPrompt", "empty"]);
  });

  it("should work with an empty registry", () => {
    const registry = createPromptRegistry({});
    expect(Object.keys(registry)).toEqual([]);
  });
});
