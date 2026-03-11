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
 * A typed prompt registry created by `createPromptRegistry()`.
 */
export interface PromptRegistry<T extends Record<string, PromptModule>> {
  /**
   * Retrieve a prompt module by name.
   *
   * @throws Error if the prompt name is not registered.
   */
  get<K extends keyof T & string>(name: K): T[K]

  /**
   * Check whether a prompt name is registered.
   */
  has(name: string): boolean

  /**
   * Return all registered prompt names.
   */
  names(): string[]
}

/**
 * Re-export the Liquid type for consumers that need to type the engine.
 */
export type { Liquid }
