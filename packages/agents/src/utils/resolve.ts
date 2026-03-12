import { isFunction } from "es-toolkit";

/**
 * A value that is either static or dynamically resolved from context.
 *
 * Use this for agent/workflow definition fields that may depend on
 * runtime state (e.g. tools, instructions, prompt).
 *
 * @typeParam T - The resolved value type.
 * @typeParam TCtx - The context type passed when resolving dynamically.
 *
 * @example
 * ```typescript
 * // Static
 * instructions: 'You are a helpful assistant'
 *
 * // Dynamic (sync)
 * instructions: (ctx) => `Analyze ${ctx.input.repoName}`
 *
 * // Dynamic (async)
 * instructions: async (ctx) => fetchPrompt(ctx.input.repoName)
 * ```
 */
export type ResolveParam<T, TCtx> = T | ((ctx: TCtx) => T | Promise<T>);

/**
 * Resolve a {@link ResolveParam} value — if it's a function, call it with ctx.
 *
 * @param value - A static value, a function of context, or undefined.
 * @param ctx - The context to pass if the value is a function.
 * @returns The resolved value, or `undefined` if the input was `undefined`.
 */
export async function resolve<T, TCtx>(
  value: ResolveParam<T, TCtx> | undefined,
  ctx: TCtx,
): Promise<T | undefined> {
  if (isFunction(value)) {
    return value(ctx);
  }
  return value;
}
