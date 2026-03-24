# agent()

Create a single-boundary LLM agent with typed I/O, tools, subagents, and `Result`-based error handling. This is the core primitive for wrapping AI SDK `generateText`/`streamText` calls.

## Function Signature

```typescript
function agent<TInput, TOutput, TTools, TSubAgents>(
  config: AgentConfig<TInput, TOutput, TTools, TSubAgents>,
): Agent<TInput, TOutput, TTools, TSubAgents>;
```

## AgentConfig

| Field          | Type                                                                                                     | Required | Default         | Description                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------- | -------- | --------------- | ------------------------------------------------------------------------------ |
| `name`         | `string`                                                                                                 | Yes      | —               | Unique agent name used in logs and trace entries                               |
| `model`        | `Resolver<TInput, Model>`                                                                                | Yes      | —               | AI SDK `LanguageModel` instance or resolver function                           |
| `input`        | `ZodType<TInput>`                                                                                        | No       | —               | Zod schema for typed input. When provided, `.generate()` accepts `TInput`      |
| `prompt`       | `(params: { input: TInput }) => string \| Message[] \| Promise<string \| Message[]>`                     | No       | —               | Maps typed input to the prompt sent to the model. Required when `input` is set |
| `system`       | `Resolver<TInput, string>`                                                                               | No       | —               | Static or dynamic system prompt                                                |
| `tools`        | `Resolver<TInput, TTools>`                                                                               | No       | —               | Record of `Tool` instances available to the agent                              |
| `agents`       | `Resolver<TInput, TSubAgents>`                                                                           | No       | —               | Record of subagents auto-wrapped as callable tools                             |
| `maxSteps`     | `Resolver<TInput, number>`                                                                               | No       | `20`            | Max tool-loop iterations                                                       |
| `output`       | `OutputParam`                                                                                            | No       | `Output.text()` | Output type strategy                                                           |
| `logger`       | `Resolver<TInput, Logger>`                                                                               | No       | pino default    | Pino-compatible logger                                                         |
| `onStart`      | `(event: { input: TInput }) => void \| Promise<void>`                                                    | No       | —               | Fires when the agent starts                                                    |
| `onFinish`     | `(event: { input: TInput; result: GenerateResult<TOutput>; duration: number }) => void \| Promise<void>` | No       | —               | Fires on success                                                               |
| `onError`      | `(event: { input: TInput; error: Error }) => void \| Promise<void>`                                      | No       | —               | Fires on error                                                                 |
| `onStepFinish` | `(event: StepFinishEvent) => void \| Promise<void>`                                                      | No       | —               | Fires after each tool-loop step                                                |

### Resolver type

```typescript
type Resolver<TInput, T> = T | ((params: { input: TInput }) => T | Promise<T>);
```

Static values or functions resolved at `.generate()` / `.stream()` time with the validated input.

## Two Modes

| Mode   | `input` schema    | `prompt` fn | `.generate()` accepts                             |
| ------ | ----------------- | ----------- | ------------------------------------------------- |
| Simple | Omitted           | Omitted     | `{ prompt: string }` or `{ messages: Message[] }` |
| Typed  | `ZodType<TInput>` | Required    | `{ input: TInput }`                               |

## Agent Interface

```typescript
interface Agent<TInput, TOutput, TTools, TSubAgents> {
  readonly model: Resolver<TInput, Model>;

  generate(
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): Promise<Result<GenerateResult<TOutput>>>;
  stream(
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): Promise<Result<StreamResult<TOutput>>>;
  fn(): (
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ) => Promise<Result<GenerateResult<TOutput>>>;
}
```

| Method              | Returns                                    | Description                               |
| ------------------- | ------------------------------------------ | ----------------------------------------- |
| `.generate(params)` | `Promise<Result<GenerateResult<TOutput>>>` | Run to completion; returns wrapped result |
| `.stream(params)`   | `Promise<Result<StreamResult<TOutput>>>`   | Run with streaming; returns stream handle |
| `.fn()`             | Function with `.generate()` signature      | Returns a plain callable function         |

## GenerateParams

Input is exactly one of `prompt`, `messages`, or `input`. All other fields are optional per-call overrides.

```typescript
type GenerateParams<TInput, TTools, TSubAgents, TOutput> = BaseGenerateParams<TInput, TOutput> &
  AgentGenerateOverrides<TTools, TSubAgents> &
  (
    | { prompt: string; messages?: undefined; input?: undefined }
    | { messages: Message[]; prompt?: undefined; input?: undefined }
    | { input: TInput; prompt?: undefined; messages?: undefined }
  );
```

| Field          | Type                                                                                                     | Description                     |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `prompt`       | `string`                                                                                                 | Raw string prompt (simple mode) |
| `messages`     | `Message[]`                                                                                              | Message array (simple mode)     |
| `input`        | `TInput`                                                                                                 | Typed input (typed mode)        |
| `model`        | `Model`                                                                                                  | Override model for this call    |
| `system`       | `string \| ((params: { input: unknown }) => string)`                                                     | Override system prompt          |
| `tools`        | `Partial<TTools> & Record<string, Tool>`                                                                 | Override/extend tools           |
| `agents`       | `Partial<TSubAgents> & Record<string, Agent>`                                                            | Override/extend subagents       |
| `maxSteps`     | `number`                                                                                                 | Override max tool-loop steps    |
| `output`       | `OutputParam`                                                                                            | Override output strategy        |
| `signal`       | `AbortSignal`                                                                                            | Cancellation signal             |
| `timeout`      | `number`                                                                                                 | Auto-abort after N milliseconds |
| `logger`       | `Logger`                                                                                                 | Override logger for this call   |
| `onStart`      | `(event: { input: TInput }) => void \| Promise<void>`                                                    | Per-call start hook             |
| `onFinish`     | `(event: { input: TInput; result: GenerateResult<TOutput>; duration: number }) => void \| Promise<void>` | Per-call finish hook            |
| `onError`      | `(event: { input: TInput; error: Error }) => void \| Promise<void>`                                      | Per-call error hook             |
| `onStepFinish` | `(event: StepFinishEvent) => void \| Promise<void>`                                                      | Per-call step-finish hook       |

Per-call hooks merge with base config hooks — base fires first, then call-level.

## GenerateResult

```typescript
interface GenerateResult<TOutput = string> {
  output: TOutput;
  messages: Message[];
  usage: TokenUsage;
  finishReason: string;
}
```

| Field          | Type         | Description                                                                    |
| -------------- | ------------ | ------------------------------------------------------------------------------ |
| `output`       | `TOutput`    | Generation output; type depends on `OutputParam`                               |
| `messages`     | `Message[]`  | Full message history including tool calls                                      |
| `usage`        | `TokenUsage` | Aggregated token counts across all tool-loop steps                             |
| `finishReason` | `string`     | `"stop"`, `"length"`, `"content-filter"`, `"tool-calls"`, `"error"`, `"other"` |

## StreamResult

```typescript
interface StreamResult<TOutput = string> {
  output: Promise<TOutput>;
  messages: Promise<Message[]>;
  usage: Promise<TokenUsage>;
  finishReason: Promise<string>;
  fullStream: AsyncIterableStream<StreamPart>;
  toTextStreamResponse(init?: ResponseInit): Response;
  toUIMessageStreamResponse(options?: ResponseInit & UIMessageStreamOptions): Response;
}
```

| Field                         | Type                              | Description                                 |
| ----------------------------- | --------------------------------- | ------------------------------------------- |
| `output`                      | `Promise<TOutput>`                | Resolves after stream completes             |
| `messages`                    | `Promise<Message[]>`              | Resolves after stream completes             |
| `usage`                       | `Promise<TokenUsage>`             | Resolves after stream completes             |
| `finishReason`                | `Promise<string>`                 | Resolves after stream completes             |
| `fullStream`                  | `AsyncIterableStream<StreamPart>` | Typed stream events; use `for await...of`   |
| `toTextStreamResponse()`      | `Response`                        | Plain-text streaming HTTP response          |
| `toUIMessageStreamResponse()` | `Response`                        | Vercel AI SDK `useChat`-compatible response |

`StreamPart` is `TextStreamPart<ToolSet>` — discriminated on `part.type`: `"text-delta"`, `"tool-call"`, `"tool-result"`, `"finish"`, `"error"`, etc.

## OutputParam

```typescript
type OutputParam = OutputSpec | ZodType;
```

| Value                        | Result type | Description                       |
| ---------------------------- | ----------- | --------------------------------- |
| `Output.text()`              | `string`    | Plain text (default)              |
| `Output.object({ schema })`  | `T`         | Validated structured object       |
| `Output.array({ element })`  | `T[]`       | Validated array                   |
| `Output.choice({ options })` | `string`    | Enum/classification               |
| `z.object({ ... })`          | `T`         | Auto-wrapped as `Output.object()` |
| `z.array(z.object({ ... }))` | `T[]`       | Auto-wrapped as `Output.array()`  |

## AgentOverrides

```typescript
type AgentOverrides<TInput, TOutput, TTools, TSubAgents, TModel> =
  | Partial<AgentConfig<TInput, TOutput, TTools, TSubAgents, TModel>>
  | ((config: AgentConfig<...>) => Partial<AgentConfig<...>>)
```

Used with `evolve()`. Accepts either a partial config object or a mapper function that receives the current config and returns partial overrides. Scalars replace; `tools` and `agents` records are shallow-merged.

## Result Pattern

Every public method returns `Result<T>` — a discriminated union. Success fields are flat on the object.

```typescript
type Result<T> = (T & { ok: true }) | { ok: false; error: ResultError };

interface ResultError {
  code: string; // machine-readable error code
  message: string; // human-readable description
  cause?: Error; // original thrown error
}
```

Check `result.ok` before accessing success fields:

```typescript
const result = await myAgent.generate({ prompt: "Hello" });
if (!result.ok) {
  console.error(result.error.code, result.error.message);
  return;
}
console.log(result.output); // TOutput
console.log(result.messages); // Message[]
```

## See Also

- [Agents concept](/concepts/agents) — overview with usage examples
- [Streaming guide](/guides/streaming)
- [`tool()` reference](/reference/agents/tool)
- [`flowAgent()` reference](/reference/agents/flow-agent)
