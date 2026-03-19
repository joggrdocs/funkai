import { z } from "zod";

// ---------------------------------------------------------------------------
// Prompts config
// ---------------------------------------------------------------------------

/** Zod schema for prompts configuration. */
export const promptsConfigSchema = z.object({
  roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
  out: z.string().describe("Output directory for generated prompt modules"),
  partials: z.string().optional().describe("Custom partials directory"),
});

/** Inferred type for prompts configuration. */
export type PromptsConfig = z.infer<typeof promptsConfigSchema>;

// ---------------------------------------------------------------------------
// Agents config
// ---------------------------------------------------------------------------

/** Zod schema for agents configuration (placeholder for future expansion). */
export const agentsConfigSchema = z.object({}).describe("Agent configuration");

/** Inferred type for agents configuration. */
export type AgentsConfig = z.infer<typeof agentsConfigSchema>;

// ---------------------------------------------------------------------------
// Root config
// ---------------------------------------------------------------------------

/** Zod schema for the funkai configuration file (`funkai.config.ts`). */
export const configSchema = z.object({
  prompts: promptsConfigSchema.optional(),
  agents: agentsConfigSchema.optional(),
});

/** Inferred type for the full funkai configuration. */
export type FunkaiConfig = z.infer<typeof configSchema>;

// ---------------------------------------------------------------------------
// defineConfig
// ---------------------------------------------------------------------------

/**
 * Define a typed funkai configuration.
 *
 * Use this in `funkai.config.ts` for type-safe configuration with editor
 * autocompletion and validation.
 *
 * @param config - The funkai configuration object.
 * @returns The same configuration object (identity function for type inference).
 *
 * @example
 * ```ts
 * import { defineConfig } from "@funkai/config";
 *
 * export default defineConfig({
 *   prompts: {
 *     roots: ["src/prompts"],
 *     out: ".prompts/client",
 *   },
 * });
 * ```
 */
export function defineConfig(config: FunkaiConfig): FunkaiConfig {
  return config;
}
