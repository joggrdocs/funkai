import { Liquid } from "liquidjs";

const DANGEROUS_NAMES = new Set(["constructor", "__proto__", "prototype"]);

/** Module-level engine — no config needed for variable extraction. */
const engine = new Liquid();

/** @private */
function extractRoot(variable: unknown): string {
  if (Array.isArray(variable)) {
    return String(variable[0]);
  }
  return String(variable);
}

/**
 * Extract top-level variable names from a Liquid template string.
 *
 * Uses LiquidJS's built-in `variablesSync` to parse the template AST
 * and extract all referenced variable names. Only returns the root
 * variable name (e.g. `user` from `{{ user.name }}`).
 *
 * @param template - The Liquid template string to parse.
 * @returns Sorted, deduplicated array of top-level variable names.
 * @throws {Error} If a variable name is dangerous (e.g. `__proto__`)
 * @example
 * ```ts
 * extractVariables("Hello {{ user.name }}, you have {{ count }} items");
 * // ["count", "user"]
 * ```
 */
export function extractVariables(template: string): readonly string[] {
  const parsed = engine.parse(template);
  const variables = engine.variablesSync(parsed);

  const roots = new Set(
    variables.map((variable) => {
      const root = extractRoot(variable);

      if (DANGEROUS_NAMES.has(root)) {
        throw new Error(`Dangerous variable name "${root}" is not allowed in prompt templates`);
      }

      return root;
    }),
  );

  return [...roots].toSorted();
}
