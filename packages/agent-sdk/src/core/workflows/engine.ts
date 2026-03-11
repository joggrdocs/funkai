import type { Logger } from '@/core/logger.js'
import { createDefaultLogger } from '@/core/logger.js'
import type { StepBuilder } from '@/core/workflows/steps/builder.js'
import type { StepInfo } from '@/core/workflows/types.js'
import type { Workflow, WorkflowConfig } from '@/core/workflows/workflow.js'
import { workflow } from '@/core/workflows/workflow.js'
import type { ExecutionContext } from '@/lib/context.js'
import { fireHooks } from '@/lib/hooks.js'

/**
 * Factory function for a custom step type.
 *
 * Receives the internal context (for trace registration, signal,
 * logging) and the user-provided config. Returns the step result.
 *
 * @typeParam TConfig - The config shape users pass to `$.myStep({ ... })`.
 * @typeParam TResult - The return type of the step.
 */
export type CustomStepFactory<TConfig, TResult> = (params: {
  /**
   * Execution context.
   *
   * Provides the abort signal and scoped logger. Used by custom
   * step implementations to integrate with the framework's
   * cancellation and logging.
   */
  ctx: ExecutionContext

  /**
   * The config object the user passed to the custom step.
   *
   * Shape is defined by the custom step type's `TConfig` parameter.
   */
  config: TConfig
}) => Promise<TResult>

/**
 * Map of custom step names to their factory functions.
 *
 * Each key becomes a method on `$` in workflows created by the engine.
 * The factory's `TConfig` and `TResult` types determine the method's
 * parameter and return types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomStepDefinitions = Record<string, CustomStepFactory<any, any>>

/**
 * Derive typed custom step methods from a definitions map.
 *
 * Maps each custom step factory to a callable method on `$`. The
 * config and result types are inferred from the factory's type
 * parameters.
 *
 * @typeParam T - The `CustomStepDefinitions` map.
 */
export type TypedCustomSteps<T extends CustomStepDefinitions> = {
  [K in keyof T]: T[K] extends CustomStepFactory<infer TConfig, infer TResult>
    ? (config: TConfig) => Promise<TResult>
    : never
}

/**
 * Configuration for creating a custom workflow engine.
 *
 * Engines add custom step types to `$` and/or set default hooks
 * for every workflow created through them.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 */
export interface EngineConfig<TCustomSteps extends CustomStepDefinitions> {
  /**
   * Custom step types to add to `$`.
   *
   * Each key-value pair defines a new method on the `$` step builder.
   * The key is the method name, the value is the factory function.
   */
  $?: TCustomSteps

  /**
   * Default hook: fires when any workflow starts.
   *
   * Applied to every workflow created by this engine. Workflow-level
   * hooks override engine-level hooks when both are set.
   *
   * @param event - Event containing the input.
   * @param event.input - The workflow input.
   */
  onStart?: (event: { input: unknown }) => void | Promise<void>

  /**
   * Default hook: fires when any workflow finishes.
   *
   * @param event - Event containing the input, output, and duration.
   * @param event.input - The workflow input.
   * @param event.output - The workflow output.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: { input: unknown; output: unknown; duration: number }) => void | Promise<void>

  /**
   * Default hook: fires when any workflow errors.
   *
   * @param event - Event containing the input and error.
   * @param event.input - The workflow input.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { input: unknown; error: Error }) => void | Promise<void>

  /**
   * Default hook: fires when any step starts.
   *
   * @param event - Event containing step info.
   * @param event.step - Information about the step that started.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>

  /**
   * Default hook: fires when any step finishes.
   *
   * @param event - Event containing step info, result, and duration.
   * @param event.step - Information about the step that finished.
   * @param event.result - The value produced by the step.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onStepFinish?: (event: {
    step: StepInfo
    result: unknown
    duration: number
  }) => void | Promise<void>
}

/**
 * A `workflow` factory with custom steps merged into `$`.
 *
 * Returned by `createWorkflowEngine`. Works like `workflow()` but
 * the handler's `$` parameter includes both built-in and custom steps.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 * @param config - Workflow configuration (name, schemas, hooks, logger).
 * @param handler - The workflow handler function. The `$` parameter
 *   includes both built-in steps and custom steps from the engine.
 * @returns A `Workflow` instance.
 */
export type WorkflowFactory<TCustomSteps extends CustomStepDefinitions> = <TInput, TOutput>(
  config: WorkflowConfig<TInput, TOutput>,
  handler: (params: {
    /**
     * Validated input.
     */
    input: TInput

    /**
     * Step builder with both built-in and custom steps.
     */
    $: StepBuilder & TypedCustomSteps<TCustomSteps>
  }) => Promise<TOutput>
) => Workflow<TInput, TOutput>

// ---------------------------------------------------------------------------
// createHookCaller (internal helper)
// ---------------------------------------------------------------------------

/**
 * Wrap a hook callback so it can be passed to `fireHooks`.
 *
 * Returns `undefined` when the hook is absent, otherwise returns a
 * thunk that invokes the hook with the given event.
 */
function createHookCaller(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: ((event: any) => void | Promise<void>) | undefined,
  event: unknown
): (() => void | Promise<void>) | undefined {
  if (hook) {
    return () => hook(event)
  }
  return undefined
}

// ---------------------------------------------------------------------------
// buildMergedHook (internal helper)
// ---------------------------------------------------------------------------

/**
 * Build a merged hook that runs engine and workflow hooks sequentially.
 *
 * Returns `undefined` if neither hook is defined, so the workflow
 * config omits the key entirely and avoids unnecessary async overhead.
 *
 * @param log - Logger for warning about hook errors.
 * @param engineHook - The engine-level hook (fires first).
 * @param workflowHook - The workflow-level hook (fires second).
 * @returns A merged hook function, or `undefined` if both are absent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMergedHook<THook extends (event: any) => void | Promise<void>>(
  log: Logger,
  engineHook: THook | undefined,
  workflowHook: THook | undefined
): THook | undefined {
  if (!engineHook && !workflowHook) {
    return undefined
  }

  const merged = async (event: unknown): Promise<void> => {
    const engineFn = createHookCaller(engineHook, event)
    const workflowFn = createHookCaller(workflowHook, event)
    await fireHooks(log, engineFn, workflowFn)
  }
  return merged as unknown as THook
}

// ---------------------------------------------------------------------------
// createWorkflowEngine
// ---------------------------------------------------------------------------

/**
 * Create a custom workflow engine with additional step types
 * and/or default hooks.
 *
 * Returns a `workflow()`-like factory. Any custom steps defined
 * in `$` are merged into the handler's `$` parameter and fully typed.
 *
 * @typeParam TCustomSteps - The custom step definitions map.
 * @param config - Engine configuration including custom steps
 *   and default hooks.
 * @returns A `WorkflowFactory` that creates workflows with custom
 *   `$` steps and engine-level default hooks.
 *
 * @example
 * ```typescript
 * const engine = createWorkflowEngine({
 *   $: {
 *     retry: async ({ ctx, config }) => {
 *       let lastError: Error | undefined
 *       for (let attempt = 0; attempt < config.attempts; attempt++) {
 *         try {
 *           return await config.execute({ attempt })
 *         } catch (err) {
 *           lastError = err as Error
 *           await sleep(config.backoff * (attempt + 1))
 *         }
 *       }
 *       throw lastError
 *     },
 *   },
 *   onStart: ({ input }) => telemetry.trackStart(input),
 *   onFinish: ({ output, duration }) => telemetry.trackFinish(output, duration),
 * })
 *
 * const myWorkflow = engine({
 *   name: 'my-workflow',
 *   input: MyInput,
 *   output: MyOutput,
 * }, async ({ input, $ }) => {
 *   // $.retry is fully typed
 *   const data = await $.retry({
 *     id: 'fetch-data',
 *     attempts: 3,
 *     backoff: 1000,
 *     execute: async () => fetch('https://api.example.com/data'),
 *   })
 *   return data
 * })
 * ```
 */
export function createWorkflowEngine<
  TCustomSteps extends CustomStepDefinitions = Record<string, never>,
>(engineConfig: EngineConfig<TCustomSteps>): WorkflowFactory<TCustomSteps> {
  return function engineCreateWorkflow<TInput, TOutput>(
    workflowConfig: WorkflowConfig<TInput, TOutput>,
    handler: (params: {
      input: TInput
      $: StepBuilder & TypedCustomSteps<TCustomSteps>
    }) => Promise<TOutput>
  ): Workflow<TInput, TOutput> {
    // Engine hooks fire FIRST, workflow hooks fire SECOND.
    // fireHooks handles undefined entries as no-ops, so we just
    // wrap both in a single function when either is present.
    const hookLog = (workflowConfig.logger ?? createDefaultLogger()).child({ source: 'engine' })

    const { onStart: engineOnStart } = engineConfig
    const { onStart: wfOnStart } = workflowConfig
    const { onFinish: engineOnFinish } = engineConfig
    const { onFinish: wfOnFinish } = workflowConfig
    const { onError: engineOnError } = engineConfig
    const { onError: wfOnError } = workflowConfig
    const { onStepStart: engineOnStepStart } = engineConfig
    const { onStepStart: wfOnStepStart } = workflowConfig
    const { onStepFinish: engineOnStepFinish } = engineConfig
    const { onStepFinish: wfOnStepFinish } = workflowConfig

    const mergedConfig: WorkflowConfig<TInput, TOutput> = {
      ...workflowConfig,
      onStart: buildMergedHook(hookLog, engineOnStart, wfOnStart),
      onFinish: buildMergedHook(hookLog, engineOnFinish, wfOnFinish),
      onError: buildMergedHook(hookLog, engineOnError, wfOnError),
      onStepStart: buildMergedHook(hookLog, engineOnStepStart, wfOnStepStart),
      onStepFinish: buildMergedHook(hookLog, engineOnStepFinish, wfOnStepFinish),
    }

    const wrappedHandler = async (params: { input: TInput; $: StepBuilder }): Promise<TOutput> => {
      // $ is already augmented by _internal.augment$ at this point
      return handler({
        input: params.input,
        $: params.$ as StepBuilder & TypedCustomSteps<TCustomSteps>,
      })
    }

    return workflow(mergedConfig, wrappedHandler, {
      augment$: ($, ctx) => {
        const customSteps: Record<string, (config: unknown) => Promise<unknown>> = {}
        for (const [name, factory] of Object.entries(engineConfig.$ ?? {})) {
          // eslint-disable-next-line security/detect-object-injection -- Key from Object.entries iteration, not user input
          customSteps[name] = (config: unknown) =>
            factory({ ctx: { signal: ctx.signal, log: ctx.log }, config })
        }
        return Object.assign($, customSteps) as StepBuilder
      },
    })
  }
}
