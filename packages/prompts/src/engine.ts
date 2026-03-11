import { Liquid } from "liquidjs";

import type { CreateEngineOptions } from "./types.js";

/**
 * Create a LiquidJS engine with custom options.
 *
 * The `partialsDir` is used as the root for `{% render %}` resolution.
 * The `.prompt` extension is appended automatically.
 *
 * @param partialsDir - Root directory for `{% render %}` partial resolution.
 * @param options - Optional overrides for the LiquidJS engine configuration.
 * @returns A configured {@link Liquid} engine instance.
 */
export function createEngine(partialsDir: string, options?: Partial<CreateEngineOptions>): Liquid {
  return new Liquid({
    root: [partialsDir],
    partials: [partialsDir],
    extname: ".prompt",
    cache: true,
    strictFilters: true,
    ownPropertyOnly: true,
    ...options,
  });
}

/**
 * Shared LiquidJS engine for rendering prompt templates at runtime.
 *
 * Partials are flattened at codegen time by the CLI, so this engine
 * only needs to handle `{{ var }}` expressions and basic Liquid
 * control flow (`{% if %}`, `{% for %}`). No filesystem access required.
 */
export const engine = new Liquid({
  strictFilters: true,
  ownPropertyOnly: true,
});
