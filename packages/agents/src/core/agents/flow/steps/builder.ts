import type { GenerateResult } from "@/core/agents/base/types.js";
import type { AgentStepConfig } from "@/core/agents/flow/steps/agent.js";
import type { AllConfig } from "@/core/agents/flow/steps/all.js";
import type { EachConfig } from "@/core/agents/flow/steps/each.js";
import type { MapConfig } from "@/core/agents/flow/steps/map.js";
import type { RaceConfig } from "@/core/agents/flow/steps/race.js";
import type { ReduceConfig } from "@/core/agents/flow/steps/reduce.js";
import type { StepResult } from "@/core/agents/flow/steps/result.js";
import type { StepConfig } from "@/core/agents/flow/steps/step.js";
import type { WhileConfig } from "@/core/agents/flow/steps/while.js";

/**
 * The `$` object — composable step utilities.
 *
 * Provides tracked operations that register data flow for observability.
 * Every call through `$` becomes an entry in the execution trace.
 *
 * `$` is passed into every callback, enabling composition and nesting.
 * You can always skip `$` and use plain imperative code — it just
 * won't appear in the trace.
 */
export interface StepBuilder {
  /**
   * Execute and register a single unit of work.
   *
   * @typeParam T - The return type of the step.
   * @param config - Step configuration with id, execute function,
   *   and optional hooks.
   * @returns A `StepResult` with `.value` containing the step's
   *   return value on success, or a `StepError` on failure.
   */
  step<T>(config: StepConfig<T>): Promise<StepResult<T>>;

  /**
   * Execute an agent call as a tracked operation.
   *
   * The framework records the agent name, input, and output in the
   * trace. Calls `agent.generate()` internally and unwraps the result —
   * agent errors become `StepError`, agent success becomes
   * `StepResult<GenerateResult>`.
   *
   * @typeParam TInput - The agent's input type.
   * @param config - Agent step configuration with id, agent, input,
   *   optional overrides, and optional hooks.
   * @returns A `StepResult` wrapping the agent's `GenerateResult`.
   */
  agent<TInput>(config: AgentStepConfig<TInput>): Promise<StepResult<GenerateResult>>;

  /**
   * Parallel map — each item is a tracked operation.
   *
   * All items run concurrently (up to `concurrency` limit).
   * Returns results in input order.
   *
   * @typeParam T - Input item type.
   * @typeParam R - Output item type.
   * @param config - Map configuration with id, input array, execute
   *   function, optional concurrency, and optional hooks.
   * @returns A `StepResult` wrapping the array of results in input order.
   */
  map<T, R>(config: MapConfig<T, R>): Promise<StepResult<R[]>>;

  /**
   * Sequential side effects — runs one item at a time.
   *
   * Returns `void`. Use `$.reduce()` if you need accumulated results.
   *
   * @typeParam T - Input item type.
   * @param config - Each configuration with id, input array, execute
   *   function, and optional hooks.
   * @returns A `StepResult` wrapping void when all items are processed.
   */
  each<T>(config: EachConfig<T>): Promise<StepResult<void>>;

  /**
   * Sequential accumulation — each step depends on the previous result.
   *
   * @typeParam T - Input item type.
   * @typeParam R - Accumulator/result type.
   * @param config - Reduce configuration with id, input array, initial
   *   value, execute function, and optional hooks.
   * @returns A `StepResult` wrapping the final accumulated value.
   */
  reduce<T, R>(config: ReduceConfig<T, R>): Promise<StepResult<R>>;

  /**
   * Conditional loop — runs while a condition holds.
   *
   * Returns the last value, or `undefined` if the condition was
   * false on the first check.
   *
   * @typeParam T - The value type produced by each iteration.
   * @param config - While configuration with id, condition, execute
   *   function, and optional hooks.
   * @returns A `StepResult` wrapping the last iteration's value, or `undefined`.
   */
  while<T>(config: WhileConfig<T>): Promise<StepResult<T | undefined>>;

  /**
   * Run heterogeneous operations concurrently — like `Promise.all`.
   *
   * Entries are factory functions that receive an `AbortSignal` and
   * return a promise. The framework starts all factories at the same
   * time so timing and traces are accurate.
   *
   * @param config - All configuration with id, entry factories,
   *   and optional hooks.
   * @returns A `StepResult` wrapping the array of results in entry order.
   */
  all(config: AllConfig): Promise<StepResult<unknown[]>>;

  /**
   * Run operations concurrently — first to finish wins.
   *
   * Entries are factory functions that receive an `AbortSignal`.
   * The first to resolve wins; losers are cancelled by aborting
   * the signal.
   *
   * @param config - Race configuration with id, entry factories,
   *   and optional hooks.
   * @returns A `StepResult` wrapping the first resolved value.
   */
  race(config: RaceConfig): Promise<StepResult<unknown>>;
}
