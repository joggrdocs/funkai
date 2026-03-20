import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createPrompt } from "@/prompt.js";

describe(createPrompt, () => {
  it("should create a prompt module with name and group", () => {
    const prompt = createPrompt({
      name: "greeting",
      group: "agents",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    expect(prompt.name).toBe("greeting");
    expect(prompt.group).toBe("agents");
  });

  it("should set group to undefined when not provided", () => {
    const prompt = createPrompt({
      name: "greeting",
      template: "Hello!",
      schema: z.object({}),
    });

    expect(prompt.group).toBeUndefined();
  });

  it("should render a template with variables", () => {
    const prompt = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}, welcome to {{ place }}!",
      schema: z.object({ name: z.string(), place: z.string() }),
    });

    const result = prompt.render({ name: "Alice", place: "Wonderland" });
    expect(result).toBe("Hello Alice, welcome to Wonderland!");
  });

  it("should render a static template with no variables", () => {
    const prompt = createPrompt({
      name: "static",
      template: "No variables here.",
      schema: z.object({}),
    });

    expect(prompt.render({})).toBe("No variables here.");
  });

  it("should validate variables against the schema", () => {
    const prompt = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    expect(prompt.validate({ name: "Alice" })).toEqual({ name: "Alice" });
  });

  it("should throw on invalid variables during render", () => {
    const prompt = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    expect(() => prompt.render({ name: 42 } as never)).toThrow();
  });

  it("should throw on invalid variables during validate", () => {
    const prompt = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema: z.object({ name: z.string() }),
    });

    expect(() => prompt.validate({ name: 42 })).toThrow();
  });

  it("should expose the schema for external validation", () => {
    const schema = z.object({ name: z.string() });
    const prompt = createPrompt({
      name: "greeting",
      template: "Hello {{ name }}!",
      schema,
    });

    expect(prompt.schema).toBe(schema);
  });
});
