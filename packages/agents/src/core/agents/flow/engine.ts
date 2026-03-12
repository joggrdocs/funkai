import type { Logger } from "@/core/logger.js";
import { createDefaultLogger } from "@/core/logger.js";
import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import type { FlowAgent, FlowAgentConfig, FlowAgentHandler } from "@/core/agents/flow/types.js";
import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import type { StepInfo } from "@/core/agents/flow/types.js";
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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomStepDefinitions = Record<string, CustomStepFactory<any, any>>;

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
  onStepFinish?: (event: {
    step: StepInfo;
    result: unknown;
    duration: number;
  }) => void | Promise<void>;
}

/**
 * A `flowAgent` factory with custom steps merged into `$`.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 */
export type FlowFactory<TCustomSteps extends CustomStepDefinitions> = <TInput, TOutput>(
  config: FlowAgentConfig<TInput, TOutput>,
  handler: (params: {
    input: TInput;
    $: StepBuilder & TypedCustomSteps<TCustomSteps>;
    log: Logger;
  }) => Promise<TOutput>,
) => FlowAgent<TInput, TOutput>;

/**
 * Wrap a hook callback so it can be passed to `fireHooks`.
 */
function createHookCaller(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: ((event: any) => void | Promise<void>) | undefined,
  event: unknown,
): (() => void | Promise<void>) | undefined {
  if (hook) {
    return () => hook(event);
  }
  return undefined;
}

/**
 * Build a merged hook that runs engine and flow agent hooks sequentially.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMergedHook<THook extends (event: any) => void | Promise<void>>(
  log: Logger,
  engineHook: THook | undefined,
  flowHook: THook | undefined,
): THook | undefined {
  if (!engineHook && !flowHook) {
    return undefined;
  }

  const merged = async (event: unknown): Promise<void> => {
    const engineFn = createHookCaller(engineHook, event);
    const flowFn = createHookCaller(flowHook, event);
    await fireHooks(log, engineFn, flowFn);
  };
  return merged as unknown as THook;
}

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
  return function engineCreateFlowAgent<TInput, TOutput>(
    flowConfig: FlowAgentConfig<TInput, TOutput>,
    handler: (params: {
      input: TInput;
      $: StepBuilder & TypedCustomSteps<TCustomSteps>;
      log: Logger;
    }) => Promise<TOutput>,
  ): FlowAgent<TInput, TOutput> {
    const hookLog = (flowConfig.logger ?? createDefaultLogger()).child({ source: "engine" });

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

    const mergedConfig: FlowAgentConfig<TInput, TOutput> = {
      ...flowConfig,
      onStart: buildMergedHook(hookLog, engineOnStart, flowOnStart),
      onFinish: buildMergedHook(hookLog, engineOnFinish, flowOnFinish),
      onError: buildMergedHook(hookLog, engineOnError, flowOnError),
      onStepStart: buildMergedHook(hookLog, engineOnStepStart, flowOnStepStart),
      onStepFinish: buildMergedHook(hookLog, engineOnStepFinish, flowOnStepFinish),
    };

    const wrappedHandler: FlowAgentHandler<TInput, TOutput> = async (params) => {
      return handler({
        input: params.input,
        $: params.$ as StepBuilder & TypedCustomSteps<TCustomSteps>,
        log: params.log,
      });
    };

    return flowAgent(mergedConfig, wrappedHandler, {
      augment$: ($, ctx) => {
        const customSteps: Record<string, (config: unknown) => Promise<unknown>> = {};
        for (const [name, factory] of Object.entries(engineConfig.$ ?? {})) {
          // eslint-disable-next-line security/detect-object-injection -- Key from Object.entries iteration, not user input
          customSteps[name] = (config: unknown) =>
            factory({ ctx: { signal: ctx.signal, log: ctx.log }, config });
        }
        return Object.assign($, customSteps) as StepBuilder;
      },
    });
  };
}
