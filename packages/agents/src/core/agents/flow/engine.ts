import { isFunction, isPlainObject } from "es-toolkit";
import { match } from "ts-pattern";

import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import type {
  FlowAgent,
  FlowAgentConfig,
  FlowAgentConfigWithOutput,
  FlowAgentConfigWithoutOutput,
  FlowAgentHandler,
  InternalFlowAgentOptions,
} from "@/core/agents/flow/types.js";
import type { Logger } from "@/core/logger.js";
import { createDefaultLogger } from "@/core/logger.js";
import type { StepFinishEvent, StepInfo } from "@/core/types.js";
import type { ExecutionContext } from "@/lib/context.js";
import { fireHooks } from "@/lib/hooks.js";

/**
 * Factory function for a custom step type.
 *
 * Receives the internal context (for signal, logging) and the
 * user-provided config. Returns the step result.
 *
 * @typeParam TConfig - The config shape users pass to `$.myStep({ ... })`.
 * @typeParam TResult - The return type of the step.
 */
export type CustomStepFactory<TConfig, TResult> = (params: {
  /**
   * Execution context.
   */
  ctx: ExecutionContext;

  /**
   * The config object the user passed to the custom step.
   */
  config: TConfig;
}) => Promise<TResult>;

/**
 * Map of custom step names to their factory functions.
 *
 * Uses `config: never` as the base constraint so that any concrete
 * `CustomStepFactory<TConfig, TResult>` is assignable via function
 * parameter contravariance — `never extends TConfig` is always true.
 */
export type CustomStepDefinitions = Record<
  string,
  (params: { ctx: ExecutionContext; config: never }) => Promise<unknown>
>;

/**
 * Derive typed custom step methods from a definitions map.
 *
 * @typeParam T - The `CustomStepDefinitions` map.
 */
export type TypedCustomSteps<T extends CustomStepDefinitions> = {
  [K in keyof T]: T[K] extends CustomStepFactory<infer TConfig, infer TResult>
    ? (config: TConfig) => Promise<TResult>
    : never;
};

/**
 * Configuration for creating a custom flow engine.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 */
export interface FlowEngineConfig<TCustomSteps extends CustomStepDefinitions> {
  /**
   * Custom step types to add to `$`.
   */
  $?: TCustomSteps;

  /**
   * Default hook: fires when any flow agent starts.
   */
  onStart?: (event: { input: unknown }) => void | Promise<void>;

  /**
   * Default hook: fires when any flow agent finishes.
   */
  onFinish?: (event: { input: unknown; result: unknown; duration: number }) => void | Promise<void>;

  /**
   * Default hook: fires when any flow agent errors.
   */
  onError?: (event: { input: unknown; error: Error }) => void | Promise<void>;

  /**
   * Default hook: fires when any step starts.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>;

  /**
   * Default hook: fires when any step finishes.
   */
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
}

/**
 * A `flowAgent` factory with custom steps merged into `$`.
 *
 * Supports both output-typed and void-output flow agents,
 * mirroring the overloads of `flowAgent()`.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 */
export interface FlowFactory<TCustomSteps extends CustomStepDefinitions> {
  /**
   * Create a flow agent with structured output.
   *
   * @typeParam TInput - Input type, inferred from the `input` Zod schema.
   * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
   * @param config - Flow agent configuration including `input` and `output` Zod schemas.
   * @param handler - Async function receiving `{ input, $, log }` that orchestrates
   *   steps via the `$` builder and returns a value matching `TOutput`.
   * @returns A {@link FlowAgent} with `.generate()` and `.stream()` methods.
   *
   * @example
   * ```typescript
   * const fa = engine(
   *   { name: 'summarize', input: z.object({ text: z.string() }), output: z.object({ summary: z.string() }) },
   *   async ({ input, $ }) => {
   *     const result = await $.agent({ agent: summarizer, input: input.text });
   *     return { summary: result.value.text };
   *   },
   * );
   * ```
   */
  <TInput, TOutput>(
    config: FlowAgentConfigWithOutput<TInput, TOutput>,
    handler: (params: {
      input: TInput;
      $: StepBuilder & TypedCustomSteps<TCustomSteps>;
      log: Logger;
    }) => Promise<TOutput>,
  ): FlowAgent<TInput, TOutput>;

  /**
   * Create a flow agent without structured output.
   *
   * The handler returns `void` — sub-agent text is collected as the
   * `string` output.
   *
   * @typeParam TInput - Input type, inferred from the `input` Zod schema.
   * @param config - Flow agent configuration with an `input` Zod schema and no `output`.
   * @param handler - Async function receiving `{ input, $, log }` that orchestrates
   *   steps via the `$` builder. Returns `void`; the aggregated sub-agent text
   *   becomes the string output.
   * @returns A {@link FlowAgent} whose output type is `string`.
   *
   * @example
   * ```typescript
   * const fa = engine(
   *   { name: 'chat', input: z.object({ message: z.string() }) },
   *   async ({ input, $ }) => {
   *     await $.agent({ agent: chatBot, input: input.message });
   *   },
   * );
   * ```
   */
  <TInput>(
    config: FlowAgentConfigWithoutOutput<TInput>,
    handler: (params: {
      input: TInput;
      $: StepBuilder & TypedCustomSteps<TCustomSteps>;
      log: Logger;
    }) => Promise<void>,
  ): FlowAgent<TInput, string>;
}

/**
 * Extract a step ID from config if it has an `id` field, otherwise use the step name.
 *
 * @private
 */
function resolveStepId(config: unknown, name: string): string {
  if (isPlainObject(config) && Object.hasOwn(config, "id")) {
    return (config as { id: string }).id;
  }
  return name;
}

/**
 * Wrap a hook callback so it can be passed to `fireHooks`.
 *
 * Generic over `TEvent` so the hook is called with the correct
 * event type without resorting to `any`.
 *
 * @private
 */
function createHookCaller<TEvent>(
  hook: ((event: TEvent) => void | Promise<void>) | undefined,
  event: TEvent,
): (() => void | Promise<void>) | undefined {
  if (hook) {
    return () => hook(event);
  }
  return undefined;
}

/**
 * Internal-only hook type used by `buildMergedHook` to accept any
 * lifecycle hook regardless of its specific event signature.
 *
 * ## Why `any` is necessary here
 *
 * Functions are **contravariant** in their parameter types. A hook
 * typed `(event: { input: TInput }) => void` is NOT assignable to
 * `(event: unknown) => void` — the subtype relationship is reversed
 * for function parameters. This means no strict type (including
 * `unknown` or `never`) can serve as a universal hook acceptor.
 *
 * `any` is the only TypeScript type that bypasses contravariance,
 * allowing all hook signatures to unify in a single merge function.
 *
 * Type safety is enforced at the public API boundary:
 * - `FlowEngineConfig` defines engine hooks with `unknown` event fields
 * - `FlowAgentConfig` defines flow hooks with `TInput`/`TOutput` event fields
 * - Both produce the correct runtime event shapes — the merge function
 *   just combines two callbacks, it never inspects or constructs events.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see JSDoc above: contravariance requires `any`
type AnyHook = ((event: any) => void | Promise<void>) | undefined;

/**
 * Build a merged hook that runs engine and flow agent hooks sequentially.
 *
 * Accepts `AnyHook` (event: unknown) directly — no generic type parameter
 * or unsafe casts needed. Call sites widen narrower hook types to `AnyHook`
 * explicitly.
 *
 * @private
 */
function buildMergedHook(
  log: Logger,
  engineHook: AnyHook,
  flowHook: AnyHook,
): AnyHook {
  if (!engineHook && !flowHook) {
    return undefined;
  }

  return async (event: unknown): Promise<void> => {
    const engineFn = createHookCaller(engineHook, event);
    const flowFn = createHookCaller(flowHook, event);
    await fireHooks(log, engineFn, flowFn);
  };
}

/**
 * Built-in StepBuilder method names that custom steps must not shadow.
 *
 * @private
 */
const RESERVED_STEP_NAMES: ReadonlySet<string> = new Set([
  "step",
  "agent",
  "map",
  "each",
  "reduce",
  "while",
  "all",
  "race",
]);

/**
 * Create a custom flow engine with additional step types
 * and/or default hooks.
 *
 * Returns a `flowAgent()`-like factory. Any custom steps defined
 * in `$` are merged into the handler's `$` parameter and fully typed.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 * @param config - Engine configuration including custom steps
 *   and default hooks.
 * @returns A `FlowFactory` that creates flow agents with custom
 *   `$` steps and engine-level default hooks.
 *
 * @example
 * ```typescript
 * const engine = createFlowEngine({
 *   $: {
 *     retry: async ({ ctx, config }) => {
 *       let lastError: Error | undefined
 *       for (let attempt = 0; attempt < config.attempts; attempt++) {
 *         try {
 *           return await config.execute({ attempt })
 *         } catch (err) {
 *           lastError = err as Error
 *         }
 *       }
 *       throw lastError
 *     },
 *   },
 *   onStart: ({ input }) => telemetry.trackStart(input),
 * })
 *
 * const myFlow = engine({
 *   name: 'my-flow',
 *   input: MyInput,
 *   output: MyOutput,
 * }, async ({ input, $ }) => {
 *   const data = await $.retry({
 *     attempts: 3,
 *     execute: async () => fetch('https://api.example.com/data'),
 *   })
 *   return data
 * })
 * ```
 */
export function createFlowEngine<
  TCustomSteps extends CustomStepDefinitions = Record<string, never>,
>(engineConfig: FlowEngineConfig<TCustomSteps>): FlowFactory<TCustomSteps> {
  // Validate custom step names at engine creation time
  const conflicting = Object.keys(engineConfig.$ ?? {}).find((name) =>
    RESERVED_STEP_NAMES.has(name),
  );
  if (conflicting) {
    throw new Error(`Custom step "${conflicting}" conflicts with a built-in StepBuilder method`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- implementation signature must accept both overloads
  return function engineCreateFlowAgent<TInput, TOutput = any>(
    flowConfig: FlowAgentConfig<TInput, TOutput>,
    handler: (params: {
      input: TInput;
      $: StepBuilder & TypedCustomSteps<TCustomSteps>;
      log: Logger;
    }) => Promise<TOutput | void>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened return to satisfy both overloads
  ): FlowAgent<TInput, any> {
    // Logger may be a Resolver function; for engine-level hooks use static value or default
    const engineLogger = match(isFunction(flowConfig.logger))
      .with(true, () => createDefaultLogger())
      .otherwise(() => (flowConfig.logger as Logger | undefined) ?? createDefaultLogger());
    const hookLog = engineLogger.child({ source: "engine" });

    const { onStart: engineOnStart } = engineConfig;
    const { onStart: flowOnStart } = flowConfig;
    const { onFinish: engineOnFinish } = engineConfig;
    const { onFinish: flowOnFinish } = flowConfig;
    const { onError: engineOnError } = engineConfig;
    const { onError: flowOnError } = flowConfig;
    const { onStepStart: engineOnStepStart } = engineConfig;
    const { onStepStart: flowOnStepStart } = flowConfig;
    const { onStepFinish: engineOnStepFinish } = engineConfig;
    const { onStepFinish: flowOnStepFinish } = flowConfig;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to merge both config variants
    const mergedConfig = {
      ...flowConfig,
      onStart: buildMergedHook(hookLog, engineOnStart, flowOnStart),
      onFinish: buildMergedHook(hookLog, engineOnFinish, flowOnFinish),
      onError: buildMergedHook(hookLog, engineOnError, flowOnError),
      onStepStart: buildMergedHook(hookLog, engineOnStepStart, flowOnStepStart),
      onStepFinish: buildMergedHook(hookLog, engineOnStepFinish, flowOnStepFinish),
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- widened to merge both config variants
    } as FlowAgentConfig<TInput, any>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to satisfy both overloads
    const wrappedHandler: FlowAgentHandler<TInput, any> = async (params) =>
      handler({
        input: params.input,
        $: params.$ as StepBuilder & TypedCustomSteps<TCustomSteps>,
        log: params.log,
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bypass overloads; runtime handles both config variants
    // oxlint-disable @typescript-eslint/no-explicit-any
    return (
      flowAgent as (
        config: FlowAgentConfig<TInput, any>,
        handler: FlowAgentHandler<TInput, any>,
        _internal?: InternalFlowAgentOptions,
      ) => FlowAgent<TInput, any>
    )(
      // oxlint-enable @typescript-eslint/no-explicit-any
      mergedConfig,
      wrappedHandler,
      {
        augment$: ($, ctx) => {
          const customSteps = Object.fromEntries(
            Object.entries(engineConfig.$ ?? {}).map(([name, factory]) => [
              name,
              async (config: unknown) => {
                const stepId = resolveStepId(config, name);
                const result = await $.step({
                  id: stepId,
                  execute: async () =>
                    factory({ ctx: { signal: ctx.signal, log: ctx.log }, config: config as never }),
                });
                if (!result.ok) {
                  throw result.error;
                }
                return result.value;
              },
            ]),
          );
          return { ...$, ...customSteps } as StepBuilder;
        },
      },
    );
  } as FlowFactory<TCustomSteps>;
}
