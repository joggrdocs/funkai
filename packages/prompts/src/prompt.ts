import { liquidEngine } from "./engine.js";
import type { PromptConfig, PromptModule } from "./types.js";

/**
 * Create a prompt module from a config object.
 *
 * Encapsulates template rendering (via LiquidJS) and variable validation
 * (via Zod) into a single {@link PromptModule}. Works for both codegen
 * output and runtime on-the-fly prompt construction.
 *
 * @param config - Prompt configuration with name, template, schema, and optional group.
 * @returns A {@link PromptModule} with `render` and `validate` methods.
 *
 * @example
 * ```ts
 * import { createPrompt } from '@funkai/prompts'
 * import { z } from 'zod'
 *
 * const greeting = createPrompt({
 *   name: 'greeting',
 *   template: 'Hello {{ name }}, welcome to {{ place }}!',
 *   schema: z.object({ name: z.string(), place: z.string() }),
 * })
 *
 * greeting.render({ name: 'Alice', place: 'Wonderland' })
 * // => "Hello Alice, welcome to Wonderland!"
 * ```
 */
export function createPrompt<T>(config: PromptConfig<T>): PromptModule<T> {
  const { name, group, template, schema } = config;

  return {
    name,
    group,
    schema,
    render(variables: T): string {
      return liquidEngine.parseAndRenderSync(
        template,
        schema.parse(variables) as Record<string, unknown>,
      );
    },
    validate(variables: unknown): T {
      return schema.parse(variables);
    },
  };
}
