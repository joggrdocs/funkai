import type { PromptModule } from "./types.js";

/**
 * Create a prompt group namespace from a record of prompt modules.
 *
 * Sets the `group` field on each module to the given group name,
 * producing a new namespace object without mutating the originals.
 *
 * @param name - Group name applied to each prompt (e.g. `'agents'`, `'agents/core'`).
 * @param prompts - Record of prompt modules to group.
 * @returns A new {@link PromptNamespace} with group-tagged prompt modules.
 *
 * @example
 * ```ts
 * import { createPrompt, createPromptGroup } from '@funkai/prompts'
 * import { z } from 'zod'
 *
 * const agents = createPromptGroup('agents', {
 *   greeting: createPrompt({
 *     name: 'greeting',
 *     template: 'Hello {{ name }}!',
 *     schema: z.object({ name: z.string() }),
 *   }),
 * })
 *
 * agents.greeting.render({ name: 'Alice' })
 * ```
 */
export function createPromptGroup<T extends Record<string, PromptModule>>(
  name: string,
  prompts: T,
): T {
  return Object.fromEntries(
    Object.entries(prompts).map(([key, module]) => [key, { ...module, group: name }]),
  ) as T;
}
