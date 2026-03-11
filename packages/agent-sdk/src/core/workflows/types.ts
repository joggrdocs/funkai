import type { OperationType } from '@/lib/trace.js'

/**
 * Information about a workflow step.
 *
 * Passed to workflow-level hooks (`onStepStart`, `onStepFinish`)
 * and included in `StepEvent` stream events.
 */
export interface StepInfo {
  /**
   * The id from the `$` config.
   *
   * Matches the `id` field on the step config that produced this event.
   */
  id: string

  /**
   * Auto-incrementing index within the workflow execution.
   *
   * Starts at `0` for the first `$` call and increments for each
   * subsequent tracked operation.
   */
  index: number

  /**
   * What kind of `$` call produced this step.
   *
   * Discriminant for filtering or grouping step events.
   */
  type: OperationType
}

/**
 * Events emitted during workflow streaming.
 *
 * Subscribe to the workflow's `stream` to receive real-time step
 * progress as the workflow executes.
 */
export type StepEvent =
  | {
      /**
       * Event type discriminant — a step has started.
       */
      type: 'step:start'

      /**
       * Information about the step that started.
       */
      step: StepInfo
    }
  | {
      /**
       * Event type discriminant — a step has finished.
       */
      type: 'step:finish'

      /**
       * Information about the step that finished.
       */
      step: StepInfo

      /**
       * The result produced by the step.
       */
      result: unknown

      /**
       * Wall-clock time for this step in milliseconds.
       */
      duration: number
    }
  | {
      /**
       * Event type discriminant — a step encountered an error.
       */
      type: 'step:error'

      /**
       * Information about the step that errored.
       */
      step: StepInfo

      /**
       * The error that occurred.
       */
      error: Error
    }
  | {
      /**
       * Event type discriminant — the workflow has finished.
       */
      type: 'workflow:finish'

      /**
       * The final workflow output.
       */
      output: unknown

      /**
       * Total wall-clock time for the workflow in milliseconds.
       */
      duration: number
    }
