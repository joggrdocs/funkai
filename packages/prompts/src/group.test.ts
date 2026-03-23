import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createPromptGroup } from "@/group.js";
import { createPrompt } from "@/prompt.js";

describe(createPromptGroup, () => {
  it("should set the group on each prompt module", () => {
    const greeting = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    const group = createPromptGroup("agents", { greeting });

    expect(group.greeting.group).toBe("agents");
  });

  it("should override existing group on prompt modules", () => {
    const greeting = createPrompt({
      name: "greeting",
      group: "old-group",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    const group = createPromptGroup("agents", { greeting });

    expect(group.greeting.group).toBe("agents");
  });

  it("should not mutate the original prompt module", () => {
    const greeting = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    createPromptGroup("agents", { greeting });

    expect(greeting.group).toBeUndefined();
  });

  it("should preserve render functionality", () => {
    const greeting = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    const group = createPromptGroup("agents", { greeting });

    expect(group.greeting.render({ name: "Alice" })).toBe("Hello Alice!");
  });

  it("should support multiple prompts in a group", () => {
    const greeting = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    const farewell = createPrompt({
      name: "farewell",
      template: "Goodbye {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    const group = createPromptGroup("agents", { greeting, farewell });

    expect(group.greeting.group).toBe("agents");
    expect(group.farewell.group).toBe("agents");
    expect(group.greeting.render({ name: "Alice" })).toBe("Hello Alice!");
    expect(group.farewell.render({ name: "Bob" })).toBe("Goodbye Bob!");
  });

  it("should support nested group paths", () => {
    const system = createPrompt({
      name: "system",
      template: "You are a {{ role }}.",
      schema: z.object({ role: z.string() }),
    });

    const group = createPromptGroup("agents/core", { system });

    expect(group.system.group).toBe("agents/core");
  });
});
