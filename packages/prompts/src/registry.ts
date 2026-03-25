import { isPlainObject } from "es-toolkit";

import type { PromptModule, PromptNamespace, PromptRegistry } from "./types.js";

/**
 * Create a typed, frozen prompt registry from a (possibly nested) map of prompt modules.
 *
 * The registry is typically created by generated code — the CLI produces
 * an `index.ts` that calls `createPromptRegistry()` with all discovered
 * prompt modules keyed by camelCase name, nested by group.
 *
 * @param modules - Record mapping camelCase prompt names (or group namespaces) to their modules.
 * @returns A deep-frozen, typed record with direct property access.
 *
 * @example
 * ```ts
 * const prompts = createPromptRegistry({
 *   agents: { coverageAssessor },
 *   greeting,
 * })
 * prompts.agents.coverageAssessor.render({ scope: 'full' })
 * ```
 */
export function createPromptRegistry<T extends PromptNamespace>(modules: T): PromptRegistry<T> {
  return deepFreeze({ ...modules });
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check whether a value looks like a PromptModule leaf.
 * Leaves have `name`, `schema`, and `render` — namespaces do not.
 *
 * @private
 */
function isPromptModule(value: unknown): value is PromptModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "render" in value &&
    "schema" in value &&
    "name" in value
  );
}

/**
 * Recursively freeze a prompt namespace tree.
 * Only recurses into plain namespace nodes — PromptModule leaves
 * (which contain Zod schemas) are intentionally left unfrozen
 * to avoid breaking Zod internal state.
 *
 * @param obj - The namespace object to freeze.
 * @returns The frozen object cast to its deep-readonly type.
 *
 * @private
 */
function deepFreeze<T extends PromptNamespace>(obj: T): PromptRegistry<T> {
  const copied = Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const isNamespace = isPlainObject(value) && !isPromptModule(value);
    if (isNamespace) {
      acc[key] = deepFreeze({ ...value } as PromptNamespace);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

  Object.freeze(copied);
  return copied as PromptRegistry<T>;
}
