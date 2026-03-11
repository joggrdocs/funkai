import { Liquid } from "liquidjs";

const DANGEROUS_NAMES = new Set(["constructor", "__proto__", "prototype"]);

/**
 * Extract top-level variable names from a Liquid template string.
 *
 * Uses LiquidJS's built-in `variablesSync` to parse the template AST
 * and extract all referenced variable names. Only returns the root
 * variable name (e.g. `user` from `{{ user.name }}`).
 *
 * @throws {Error} If a variable name is dangerous (e.g. `__proto__`)
 */
export function extractVariables(template: string): string[] {
  const engine = new Liquid();
  const parsed = engine.parse(template);
  const variables = engine.variablesSync(parsed);

  const roots = new Set(
    variables.map((variable) => {
      const root = Array.isArray(variable) ? String(variable[0]) : String(variable);

      if (DANGEROUS_NAMES.has(root)) {
        throw new Error(`Dangerous variable name "${root}" is not allowed in prompt templates`);
      }

      return root;
    }),
  );

  return [...roots].toSorted();
}
