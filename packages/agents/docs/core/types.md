# Core Types

Reference for the core types used across `@funkai/agents`: `Message`, `Result<T>`, `GenerateResult`, `StreamResult`, `StepResult`, and related interfaces.

## Result\<T\>

Discriminated union for SDK operation results. Success fields are **flat on the object** -- no `.value` wrapper. Callers pattern-match on `ok` instead of using try/catch.

```ts
type Result<T> = (T & { ok: true }) | { ok: false; error: ResultError };
```

### ResultError

```ts
interface ResultError {
  code: string; // machine-readable error code
  message: string; // human-readable description
  cause?: Error; // original thrown error
}
```

### Pattern Matching

```ts
import { match } from "ts-pattern";

const result = await myAgent.generate("Explain TypeScript generics");

const output = match(result)
  .with({ ok: true }, (r) => r.output)
  .with({ ok: false }, (r) => {
    console.error(r.error.code, r.error.message);
    return "Generation failed";
  })
  .exhaustive();
```

### Constructors and Guards

| Function  | Signature                                             | Description              |
| --------- | ----------------------------------------------------- | ------------------------ |
| `ok()`    | `(value: T) => T & { ok: true }`                      | Create a success result  |
| `err()`   | `(code, message, cause?) => { ok: false; ... }`       | Create a failure result  |
| `isOk()`  | `(result: Result<T>) => result is T & { ok: true }`   | Narrow to success branch |
| `isErr()` | `(result: Result<T>) => result is { ok: false; ... }` | Narrow to failure branch |

```ts
import { ok, err, isOk, isErr } from "@funkai/agents";

const success = ok({ output: "hello", messages: [] });
const failure = err("VALIDATION_ERROR", "Name is required");

if (isOk(success)) {
  console.log(success.output);
}

if (isErr(failure)) {
  console.log(failure.error.code);
}
```

## Message

Chat message type re-exported from the Vercel AI SDK (`ModelMessage`). Used for multi-turn conversations, message arrays, and tool-call history.

```ts
type Message = ModelMessage;
```

Messages appear in `GenerateResult.messages` and `StreamResult.messages`. They include system messages, user prompts, assistant responses, and tool call/result pairs.

## GenerateResult\<TOutput\>

Result of a completed agent generation. Returned by `agent.generate()` inside a `Result` wrapper.

```ts
interface GenerateResult<TOutput = string> {
  output: TOutput;
  messages: Message[];
  usage: TokenUsage;
  finishReason: string;
}
```

| Field          | Type         | Description                                                        |
| -------------- | ------------ | ------------------------------------------------------------------ |
| `output`       | `TOutput`    | The generation output (typed based on `Output` strategy)           |
| `messages`     | `Message[]`  | Full message history including tool calls                          |
| `usage`        | `TokenUsage` | Aggregated token usage across all tool-loop steps                  |
| `finishReason` | `string`     | Why the model stopped (`"stop"`, `"length"`, `"tool-calls"`, etc.) |

### Output Typing

The `TOutput` type depends on the configured `Output` variant:

| Output Strategy              | `TOutput` Type   |
| ---------------------------- | ---------------- |
| `Output.text()` (default)    | `string`         |
| `Output.object({ schema })`  | Schema type `T`  |
| `Output.array({ element })`  | `T[]`            |
| `Output.choice({ options })` | Union of options |

## StreamResult\<TOutput\>

Result of a streaming agent generation. Returned by `agent.stream()` inside a `Result` wrapper.

```ts
interface StreamResult<TOutput = string> {
  output: Promise<TOutput>;
  messages: Promise<Message[]>;
  usage: Promise<TokenUsage>;
  finishReason: Promise<string>;
  fullStream: AsyncIterableStream<StreamPart>;
}
```

| Field          | Type                              | Description                         |
| -------------- | --------------------------------- | ----------------------------------- |
| `output`       | `Promise<TOutput>`                | Resolves after the stream completes |
| `messages`     | `Promise<Message[]>`              | Resolves after the stream completes |
| `usage`        | `Promise<TokenUsage>`             | Resolves after the stream completes |
| `finishReason` | `Promise<string>`                 | Resolves after the stream completes |
| `fullStream`   | `AsyncIterableStream<StreamPart>` | Live stream of typed events         |

The `fullStream` is available immediately. Consume it for incremental output, then await `output`/`messages` after the stream ends.

## StreamPart

Discriminated union of all stream event types. Re-exported from the AI SDK as `TextStreamPart<ToolSet>`. Discriminate on `part.type`:

| `type`          | Description                |
| --------------- | -------------------------- |
| `"text-delta"`  | Incremental text output    |
| `"tool-call"`   | Model invoked a tool       |
| `"tool-result"` | Tool execution completed   |
| `"finish"`      | Generation completed       |
| `"error"`       | An error occurred          |
| `"step-finish"` | A tool-loop step completed |

## StepResult\<T\>

Discriminated union for flow agent step operation results. Includes `step` metadata and `duration` alongside the success/failure branches.

```ts
type StepResult<T> =
  | { ok: true; value: T; step: StepInfo; duration: number }
  | { ok: false; error: StepError; step: StepInfo; duration: number };
```

### StepInfo

```ts
interface StepInfo {
  id: string; // from the $ config
  index: number; // auto-incrementing within the flow execution
  type: OperationType; // what kind of $ call produced this step
}
```

### StepError

Extends `ResultError` with the step's `id`:

```ts
interface StepError extends ResultError {
  stepId: string;
}
```

### Pattern Matching on StepResult

```ts
import { match } from "ts-pattern";

const step = await $.step({
  id: "fetch-data",
  execute: async () => fetchData(),
});

const data = match(step)
  .with({ ok: true }, (s) => s.value)
  .with({ ok: false }, (s) => {
    console.error(`Step ${s.error.stepId} failed: ${s.error.code}`);
    return fallbackData;
  })
  .exhaustive();
```

## FlowAgentGenerateResult\<TOutput\>

Extends `GenerateResult` with flow-specific fields. Returned by `flowAgent.generate()`.

```ts
interface FlowAgentGenerateResult<TOutput> extends GenerateResult<TOutput> {
  trace: readonly TraceEntry[];
  duration: number;
}
```

| Field      | Type                    | Description                                     |
| ---------- | ----------------------- | ----------------------------------------------- |
| `trace`    | `readonly TraceEntry[]` | Frozen trace tree of all tracked `$` operations |
| `duration` | `number`                | Total wall-clock time in milliseconds           |

## TokenUsage

Aggregated token counts. Re-exported from `@funkai/models`.

```ts
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
}
```

All fields are resolved numbers (0 when the provider does not report a given field).

## References

- [Core Overview](overview.md)
- [Tracing](tracing.md)
- [Streaming](../advanced/streaming.md)
- [Output Strategies](../reference/output-strategies.md)
