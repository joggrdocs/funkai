import type { BaseGenerateResult } from "@/core/agents/types.js";
import type { AgentChainEntry } from "@/core/types.js";
import type { OperationType } from "@/lib/trace.js";
import type { ResultError } from "@/utils/result.js";

/**
 * Error information for a failed step.
 *
 * Extends {@link ResultError} with the step's `id` so error handlers
 * can correlate failures back to a specific `$` call.
 */
export interface StepError extends ResultError {
  /**
   * The `id` from the step config that failed.
   */
  readonly stepId: string;
}

/**
 * Discriminated union for flow step operation results.
 *
 * The success value is available via `.output`. Callers pattern-match
 * on `ok` instead of using try/catch.
 *
 * All step metadata fields are flat — no nested `step` object.
 *
 * @typeParam T - The success payload type.
 */
export type FlowStepResult<T> =
  | {
      readonly ok: true;
      readonly output: T;
      readonly stepId: string;
      readonly stepOperation: OperationType;
      readonly duration: number;
      readonly agentChain?: readonly AgentChainEntry[] | undefined;
    }
  | {
      readonly ok: false;
      readonly error: StepError;
      readonly stepId: string;
      readonly stepOperation: OperationType;
      readonly duration: number;
      readonly agentChain?: readonly AgentChainEntry[] | undefined;
    };

/**
 * Flat result type for `$.agent()` flow steps.
 *
 * On success, the `BaseGenerateResult` fields (`output`, `usage`,
 * `finishReason`) are spread directly onto the result — no double-wrapping.
 * `result.output` is the agent's output directly.
 *
 * @typeParam TOutput - The agent's output type (default: `string`).
 */
export type FlowAgentStepResult<TOutput = string> =
  | (BaseGenerateResult<TOutput> & {
      readonly ok: true;
      readonly stepId: string;
      readonly stepOperation: "agent";
      readonly duration: number;
      readonly agentChain?: readonly AgentChainEntry[] | undefined;
    })
  | {
      readonly ok: false;
      readonly error: StepError;
      readonly stepId: string;
      readonly stepOperation: "agent";
      readonly duration: number;
      readonly agentChain?: readonly AgentChainEntry[] | undefined;
    };
