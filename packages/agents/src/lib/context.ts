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
 * Created by the framework when a workflow or agent starts. Threaded
 * through every `$` call automatically. Users never create, pass,
 * or interact with this directly.
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
   * Read this after workflow completion to inspect the full execution graph.
   */
  readonly trace: TraceEntry[];
}
