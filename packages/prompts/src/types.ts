import type { Liquid, LiquidOptions } from 'liquidjs'
import type { ZodType } from 'zod'

/**
 * Options for creating a custom LiquidJS engine.
 */
export type CreateEngineOptions = Pick<
  LiquidOptions,
  | 'root'
  | 'partials'
  | 'extname'
  | 'cache'
  | 'strictFilters'
  | 'strictVariables'
  | 'ownPropertyOnly'
>

/**
 * A single prompt module produced by codegen.
 *
 * Each `.prompt` file generates a default export conforming to this shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic default type parameter for PromptModule
export interface PromptModule<T = any> {
  readonly name: string
  readonly group: string | undefined
  readonly schema: ZodType<T>
  render(variables: T): string
  validate(variables: unknown): T
}

/**
 * A nested namespace node in the prompt tree.
 * Values are either PromptModule leaves or further nested namespaces.
 */
export type PromptNamespace = {
  readonly [key: string]: PromptModule | PromptNamespace
}

/**
 * Deep-readonly version of a prompt tree.
 * Prevents reassignment at any nesting level.
 *
 * @example
 * ```ts
 * type MyRegistry = PromptRegistry<{
 *   agents: { coverageAssessor: PromptModule }
 *   greeting: PromptModule
 * }>
 * ```
 */
export type PromptRegistry<T extends PromptNamespace> = {
  readonly [K in keyof T]: T[K] extends PromptModule
    ? T[K]
    : T[K] extends PromptNamespace
      ? PromptRegistry<T[K]>
      : T[K]
}

/**
 * Re-export the Liquid type for consumers that need to type the engine.
 */
export type { Liquid }
