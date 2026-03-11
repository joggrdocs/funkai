# Core Concepts

The core module provides the fundamental building blocks: `agent()`, `workflow()`, `tool()`, and the `$` step builder. All public operations return `Result<T>` so callers never need try/catch.

## Result Type

```ts
type Result<T> = (T & { ok: true }) | { ok: false; error: ResultError };
```

Success fields are **flat on the object** -- no `.value` wrapper. Callers pattern-match on `ok`:

```ts
const result = await myAgent.generate("hello");

if (!result.ok) {
  console.error(result.error.code, result.error.message);
  return;
}

// Success -- all fields from T are directly on result
console.log(result.output);
console.log(result.messages);
```

`ResultError` has `code` (machine-readable), `message` (human-readable), and optional `cause` (original thrown error).

Helper constructors and type guards are exported: `ok()`, `err()`, `isOk()`, `isErr()`.

## Context

The framework creates an internal `Context` for each workflow execution. Users never create or pass this directly.

```ts
interface ExecutionContext {
  readonly signal: AbortSignal;
  readonly log: Logger;
}
```

`ExecutionContext` is the public subset exposed to custom step factories via `createWorkflowEngine()`. The internal `Context` extends it with a mutable `trace: TraceEntry[]` array for recording the execution graph.

## Logger

Pino-compatible leveled logger with `child()` support for scoped bindings.

```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}
```

Each level also supports pino's object-first overload: `log.info({ key: 'val' }, 'message')`.

The framework calls `child()` at scope boundaries (workflow, step, agent) so log output automatically includes execution context (`workflowId`, `stepId`, `agentId`). When no logger is injected, `createDefaultLogger()` provides a console-based fallback.

## TraceEntry

Every tracked `$` operation produces a `TraceEntry`. Nested operations appear as `children`, forming a tree that represents the full execution graph.

```ts
interface TraceEntry {
  id: string; // from the $ config's `id` field
  type: OperationType; // 'step' | 'agent' | 'map' | 'each' | 'reduce' | 'while' | 'all' | 'race'
  input?: unknown; // captured when the operation starts
  output?: unknown; // captured on success
  startedAt: number; // Unix ms
  finishedAt?: number; // Unix ms (undefined while running)
  error?: Error; // set on failure
  usage?: TokenUsage; // token usage (populated for successful agent steps)
  children?: TraceEntry[];
}
```

The trace is exposed on `WorkflowResult.trace` as a frozen (immutable) snapshot after workflow completion.

## References

- [Agent](agent.md)
- [Workflow](workflow.md)
- [Step Builder ($)](step.md)
- [Tools](tools.md)
- [Hooks](hooks.md)
