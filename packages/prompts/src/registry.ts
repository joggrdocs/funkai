import type { PromptModule, PromptRegistry } from './types.js'

/**
 * Create a typed prompt registry from a map of prompt modules.
 *
 * The registry is typically created by generated code — the CLI produces
 * an `index.ts` that calls `createPromptRegistry()` with all discovered
 * prompt modules.
 *
 * @param initial - Record mapping prompt names to their modules.
 * @returns A typed registry with `get`, `has`, and `names` methods.
 */
export function createPromptRegistry<T extends Record<string, PromptModule>>(
  initial: T
): PromptRegistry<T> {
  const store = new Map<string, PromptModule>(Object.entries(initial))

  return {
    get<K extends keyof T & string>(name: K): T[K] {
      const mod = store.get(name)
      if (!mod) {
        throw new Error(`Unknown prompt: "${name}"`)
      }
      return mod as T[K]
    },
    has(name: string): boolean {
      return store.has(name)
    },
    names(): string[] {
      return [...store.keys()]
    },
  }
}
