import { Liquid } from "liquidjs";
import { match } from "ts-pattern";

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

  const roots = new Set<string>();
  for (const variable of variables) {
    const root = match(Array.isArray(variable))
      .with(true, () => String((variable as unknown as unknown[])[0]))
      .otherwise(() => String(variable));

    if (DANGEROUS_NAMES.has(root)) {
      throw new Error(`Dangerous variable name "${root}" is not allowed in prompt templates`);
    }

    roots.add(root);
  }

  return [...roots].toSorted();
}
