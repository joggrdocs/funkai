import type { PromptNamespace, PromptRegistry } from './types.js'

/**
 * Check whether a value looks like a PromptModule leaf.
 * Leaves have `name`, `schema`, and `render` — namespaces do not.
 */
function isPromptModule(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'render' in value &&
    'schema' in value &&
    'name' in value
  )
}

/**
 * Recursively freeze a prompt namespace tree.
 * Only recurses into plain namespace nodes — PromptModule leaves
 * (which contain Zod schemas) are frozen shallowly.
 *
 * @param obj - The namespace object to freeze.
 * @returns The frozen object cast to its deep-readonly type.
 */
function deepFreeze<T extends PromptNamespace>(obj: T): PromptRegistry<T> {
  Object.freeze(obj)
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value) && !isPromptModule(value)) {
      deepFreeze(value as PromptNamespace)
    }
  }
  return obj as PromptRegistry<T>
}

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
export function createPromptRegistry<T extends PromptNamespace>(
  modules: T
): PromptRegistry<T> {
  return deepFreeze({ ...modules })
}
