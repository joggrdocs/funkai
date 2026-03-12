import { match, P } from "ts-pattern";

import type { TokenUsage } from "@/core/provider/types.js";

/**
 * Known trace operation types.
 *
 * Each `$` method registers a specific operation type in the execution
 * trace. This discriminant allows consumers to filter or group trace
 * entries by kind.
 */
export type OperationType = "step" | "agent" | "map" | "each" | "reduce" | "while" | "all" | "race";

/** @deprecated Use `OperationType` instead. */
export type TraceType = OperationType;

/**
 * A single entry in the execution trace.
 *
 * Every tracked `$` operation produces a TraceEntry. Nested operations
 * (e.g. agent calls inside a map iteration) appear as children,
 * forming a tree that represents the full execution graph.
 *
 * @internal
 *   Part of the internal execution context. Exposed on
 *   `WorkflowResult.trace` for observability but not directly
 *   constructed by user code.
 */
export interface TraceEntry {
  /**
   * Unique id of this operation.
   *
   * Corresponds to the `id` field from the `$` config that
   * produced this entry.
   */
  id: string;

  /**
   * What kind of operation produced this entry.
   *
   * Discriminant for filtering or grouping trace entries.
   */
  type: OperationType;

  /**
   * Input snapshot.
   *
   * Captured when the operation starts. May be `undefined` for
   * operations that have no meaningful input (e.g. `$.all`).
   */
  input?: unknown;

  /**
   * Output snapshot.
   *
   * Captured when the operation completes successfully. `undefined`
   * if the operation is still running or failed.
   */
  output?: unknown;

  /**
   * Start time in Unix milliseconds.
   *
   * Set when the operation begins execution.
   */
  startedAt: number;

  /**
   * End time in Unix milliseconds.
   *
   * Set when the operation completes (success or failure).
   * `undefined` while the operation is still running.
   */
  finishedAt?: number;

  /**
   * Error instance if the operation failed.
   *
   * `undefined` on success or while still running.
   */
  error?: Error;

  /**
   * Token usage from this operation.
   *
   * Populated for `agent` type entries that complete successfully.
   * `undefined` for non-agent steps or failed operations.
   */
  usage?: TokenUsage;

  /**
   * Nested trace entries for child operations.
   *
   * Present when this operation spawns sub-operations
   * (e.g. individual iterations inside `$.map`, or nested
   * `$.step` calls inside a step's `execute` callback).
   */
  children?: readonly TraceEntry[];
}

/**
 * Recursively collect all {@link TokenUsage} values from a trace tree.
 *
 * Walks every entry (including nested children) and returns a flat
 * array of usage objects. Entries without usage are skipped.
 *
 * @param trace - The trace array to collect from.
 * @returns Flat array of {@link TokenUsage} values found in the tree.
 */
export function collectUsages(trace: readonly TraceEntry[]): TokenUsage[] {
  return trace.flatMap((entry) => {
    const usages: TokenUsage[] = match(entry.usage)
      .with(P.nonNullable, (u) => [u])
      .otherwise(() => []);
    if (entry.children != null && entry.children.length > 0) {
      return [...usages, ...collectUsages(entry.children)];
    }
    return usages;
  });
}

/**
 * Recursively deep-clone and freeze a trace array.
 *
 * Returns a structurally identical tree that is `Object.freeze`d at
 * every level, preventing post-run mutation of the result trace.
 *
 * @internal
 */
export function snapshotTrace(trace: readonly TraceEntry[]): readonly TraceEntry[] {
  return Object.freeze(
    trace.map((entry) => {
      const children = match(entry.children)
        .with(P.nonNullable, (c) => snapshotTrace(c))
        .otherwise(() => undefined);
      const childSpread = match(children)
        .with(P.nonNullable, (c) => ({ children: c }))
        .otherwise(() => ({}));
      return Object.freeze({
        ...entry,
        ...childSpread,
      });
    }),
  );
}
