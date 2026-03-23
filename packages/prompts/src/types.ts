import type { Liquid, LiquidOptions } from "liquidjs";
import type { ZodType } from "zod";

/**
 * Options for creating a custom LiquidJS engine.
 */
export type CreateEngineOptions = Pick<
  LiquidOptions,
  "root" | "partials" | "extname" | "cache" | "strictVariables"
>;

/**
 * Configuration for creating a prompt module via {@link createPrompt}.
 *
 * @example
 * ```ts
 * const config: PromptConfig<{ name: string }> = {
 *   name: 'greeting',
 *   template: 'Hello {{ name }}!',
 *   schema: z.object({ name: z.string() }),
 * }
 * ```
 */
export interface PromptConfig<T = unknown> {
  /** Kebab-case prompt identifier (e.g. `'greeting'`, `'worker-system'`). */
  readonly name: string;
  /** LiquidJS template string with `{{ variable }}` expressions. */
  readonly template: string;
  /** Zod schema for validating template variables. */
  readonly schema: ZodType<T>;
  /** Optional group path (e.g. `'agents'`, `'agents/core'`). */
  readonly group?: string;
}

/**
 * A single prompt module produced by {@link createPrompt} or codegen.
 *
 * Each `.prompt` file generates a default export conforming to this shape.
 */
export interface PromptModule<T = unknown> {
  readonly name: string;
  readonly group: string | undefined;
  readonly schema: ZodType<T>;
  render(variables: T): string;
  validate(variables: unknown): T;
}

/**
 * A nested namespace node in the prompt tree.
 * Values are either PromptModule leaves or further nested namespaces.
 */
export interface PromptNamespace {
  readonly [key: string]: PromptModule | PromptNamespace;
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
      : T[K];
};

/**
 * Re-export the Liquid type for consumers that need to type the engine.
 */
export type { Liquid };
