import type { Message } from "@/core/agents/base/types.js";
import type { Logger } from "@/core/logger.js";
import type { TraceEntry } from "@/lib/trace.js";

/**
 * Public execution context for custom step factories.
 *
 * Provides the abort signal and scoped logger — the minimal surface
 * needed to integrate with framework cancellation and logging.
 * The mutable trace is internal-only.
 */
export interface ExecutionContext {
  readonly signal: AbortSignal;
  readonly log: Logger;
}

/**
 * Internal execution context.
 *
 * Created by the framework when a workflow or flow agent starts.
 * Threaded through every `$` call automatically. Users never create,
 * pass, or interact with this directly.
 *
 * @internal
 *   Only accessible to framework internals. Custom step factories
 *   receive {@link ExecutionContext} instead.
 */
export interface Context extends ExecutionContext {
  /**
   * Execution trace — every tracked operation is recorded here.
   *
   * The framework appends entries as `$` operations start and complete.
   * Read this after workflow/flow agent completion to inspect the full
   * execution graph.
   */
  readonly trace: TraceEntry[];

  /**
   * Synthetic messages produced by `$` steps.
   *
   * Each tracked operation pushes a tool-call (assistant) message when
   * it starts and a tool-result (tool) message when it finishes.
   * The array is flat — nested steps push to the same array so messages
   * appear in execution order.
   *
   * Used by `flowAgent` to populate `GenerateResult.messages`.
   */
  readonly messages: Message[];
}
