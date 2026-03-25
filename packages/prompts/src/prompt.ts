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
    /**
     * Render the prompt template with the given variables.
     *
     * @param variables - Template variables matching the prompt schema.
     * @returns The rendered prompt string.
     * @throws {ZodError} If variables fail schema validation.
     */
    render(variables: T): string {
      return liquidEngine.parseAndRenderSync(
        template,
        schema.parse(variables) as Record<string, unknown>,
      );
    },
    /**
     * Validate variables against the prompt schema.
     *
     * @param variables - Variables to validate.
     * @returns The parsed and validated variables.
     * @throws {ZodError} If variables fail schema validation.
     */
    validate(variables: unknown): T {
      return schema.parse(variables);
    },
  };
}
