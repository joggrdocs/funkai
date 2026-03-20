import { z } from "zod";

// ---------------------------------------------------------------------------
// Prompts config
// ---------------------------------------------------------------------------

/**
 * Zod schema for a prompt group definition.
 *
 * Groups assign prompts to namespaces based on file path patterns.
 * Prompts matched by `includes` (and not `excludes`) get the group
 * assigned — unless frontmatter already defines a `group`.
 */
export const promptGroupSchema = z.object({
  name: z.string().describe("Group path (e.g. 'agents/core')"),
  includes: z.array(z.string()).describe("Glob patterns to match prompt file paths"),
  excludes: z.array(z.string()).optional().describe("Glob patterns to exclude from this group"),
});

/** Inferred type for a prompt group definition. */
export type PromptGroup = z.infer<typeof promptGroupSchema>;

/** Zod schema for prompts configuration. */
export const promptsConfigSchema = z.object({
  includes: z.array(z.string()).optional().describe("Glob patterns to scan for .prompt files (defaults to recursive scan from './')"),
  excludes: z.array(z.string()).optional().describe("Glob patterns to exclude from discovery"),
  out: z.string().optional().describe("Output directory for generated prompt modules"),
  partials: z.string().optional().describe("Custom partials directory"),
  groups: z.array(promptGroupSchema).optional().describe("Pattern-based group assignments"),
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
// DefineConfig
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
 *     includes: ["src/prompts/**"],
 *     excludes: ["**\/*.partial.prompt"],
 *     out: ".prompts/client",
 *     groups: [
 *       {
 *         name: "agents/core",
 *         includes: ["src/prompts/agents/core/**"],
 *       },
 *     ],
 *   },
 * });
 * ```
 */
export function defineConfig(config: FunkaiConfig): FunkaiConfig {
  return config;
}
