import type { AgentOverrides, GenerateResult } from '@/core/agent/types.js'
import type { Runnable } from '@/core/types.js'

/**
 * Configuration for `$.agent()` — execute an agent call as a tracked operation.
 *
 * The `input` field matches whatever the agent accepts — typed `TInput`
 * if the agent has a schema, or `string | Message[]` for simple agents.
 *
 * @typeParam TInput - The agent's input type.
 */
export interface AgentStepConfig<TInput> {
  /**
   * Unique step identifier.
   *
   * Appears in the execution trace, hook events, and error messages.
   */
  id: string

  /**
   * The agent to invoke.
   *
   * The framework calls `agent.generate()` internally with the
   * provided `input` and optional `config` overrides.
   */
  agent: Runnable<TInput>

  /**
   * Input to pass to the agent.
   *
   * Same as what you'd pass to `agent.generate()` — typed `TInput`
   * for agents with an input schema, or `string | Message[]` for
   * simple agents.
   */
  input: TInput

  /**
   * Optional inline overrides for this agent call.
   *
   * Accepts the same fields as `AgentOverrides` — model, output,
   * tools, hooks, etc.
   */
  config?: AgentOverrides

  /**
   * Hook: fires when this agent step starts.
   *
   * @param event - Event containing the step id.
   * @param event.id - The step's unique identifier.
   */
  onStart?: (event: { id: string }) => void | Promise<void>

  /**
   * Hook: fires when this agent step finishes.
   *
   * @param event - Event containing the step id, result, and duration.
   * @param event.id - The step's unique identifier.
   * @param event.result - The agent's `GenerateResult`.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: {
    id: string
    result: GenerateResult
    duration: number
  }) => void | Promise<void>

  /**
   * Hook: fires when this agent step encounters an error.
   *
   * @param event - Event containing the step id and error.
   * @param event.id - The step's unique identifier.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { id: string; error: Error }) => void | Promise<void>
}
