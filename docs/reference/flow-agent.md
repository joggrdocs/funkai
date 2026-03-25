# flowAgent()

Create a multi-step agent whose orchestration logic is plain imperative TypeScript. The handler function receives a `$` StepBuilder for tracked operations that appear in the execution trace. Flow agents require a typed `input` Zod schema; the `output` schema is optional (omitting it yields a `string` output from collected sub-agent text).

## Function Signature

```typescript
// With structured output
function flowAgent<TInput, TOutput>(
  config: FlowAgentConfigWithOutput<TInput, TOutput>,
  handler: FlowAgentHandler<TInput, TOutput>,
): FlowAgent<TInput, TOutput>;

// Without output schema (void handler, string output)
function flowAgent<TInput>(
  config: FlowAgentConfigWithoutOutput<TInput>,
  handler: FlowAgentHandler<TInput, void>,
): FlowAgent<TInput, string>;
```

## FlowAgentConfig

`FlowAgentConfig<TInput, TOutput>` is a union of the two variants below.

### Shared fields (both variants)

| Field          | Type                                                                | Required | Default | Description                                |
| -------------- | ------------------------------------------------------------------- | -------- | ------- | ------------------------------------------ |
| `name`         | `string`                                                            | Yes      | —       | Unique flow agent name                     |
| `input`        | `ZodType<TInput>`                                                   | Yes      | —       | Zod schema for validating input            |
| `agents`       | `FlowSubAgents`                                                     | No       | —       | Named agent dependencies passed to handler |
| `logger`       | `Resolver<TInput, Logger>`                                          | No       | default | Pino-compatible logger                     |
| `onStart`      | `(event: { input: TInput }) => void \| Promise<void>`               | No       | —       | Fires when flow starts                     |
| `onError`      | `(event: { input: TInput; error: Error }) => void \| Promise<void>` | No       | —       | Fires on error                             |
| `onStepStart`  | `(event: StepStartEvent) => void \| Promise<void>`                  | No       | —       | Fires when a `$` step starts               |
| `onStepFinish` | `(event: StepFinishEvent) => void \| Promise<void>`                 | No       | —       | Fires when a `$` step finishes             |

### With output (`FlowAgentConfigWithOutput`)

| Field      | Type                                                                                                              | Required | Description                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| `output`   | `ZodType<TOutput>`                                                                                                | Yes      | Zod schema validating handler return value |
| `onFinish` | `(event: { input: TInput; result: FlowAgentGenerateResult<TOutput>; duration: number }) => void \| Promise<void>` | No       | Fires on success                           |

### Without output (`FlowAgentConfigWithoutOutput`)

| Field      | Type                                                                                                             | Required | Description                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ |
| `output`   | `undefined`                                                                                                      | —        | Omitted or `undefined`               |
| `onFinish` | `(event: { input: TInput; result: FlowAgentGenerateResult<string>; duration: number }) => void \| Promise<void>` | No       | Fires on success; output is `string` |

## FlowAgentHandler

```typescript
type FlowAgentHandler<TInput, TOutput> = (params: FlowAgentParams<TInput>) => Promise<TOutput>;
```

### FlowAgentParams

| Field    | Type            | Description                                       |
| -------- | --------------- | ------------------------------------------------- |
| `input`  | `TInput`        | Validated input                                   |
| `$`      | `StepBuilder`   | Composable step utilities (see StepBuilder below) |
| `log`    | `Logger`        | Scoped logger for this execution                  |
| `agents` | `FlowSubAgents` | Named agent dependencies from config              |

## FlowAgentGenerateResult

Extends `GenerateResult<TOutput>` with flow-specific fields.

```typescript
interface FlowAgentGenerateResult<TOutput> extends GenerateResult<TOutput> {
  trace: readonly TraceEntry[];
  duration: number;
}
```

| Field          | Type                    | Description                           |
| -------------- | ----------------------- | ------------------------------------- |
| `output`       | `TOutput`               | Validated handler return value        |
| `messages`     | `Message[]`             | Full message history                  |
| `usage`        | `TokenUsage`            | Aggregated token counts               |
| `finishReason` | `string`                | Finish reason string                  |
| `trace`        | `readonly TraceEntry[]` | Frozen execution trace tree           |
| `duration`     | `number`                | Total wall-clock time in milliseconds |

## FlowAgent Interface

```typescript
interface FlowAgent<TInput, TOutput> {
  generate(params: GenerateParams<TInput, ...>): Promise<Result<FlowAgentGenerateResult<TOutput>>>
  stream(params: GenerateParams<TInput, ...>): Promise<Result<StreamResult<TOutput>>>
  fn(): (params: GenerateParams<TInput, ...>) => Promise<Result<FlowAgentGenerateResult<TOutput>>>
}
```

## StepBuilder ($)

The `$` object provides tracked operations. Every call appears in the execution trace. `$` is passed into nested callbacks so operations can be composed.

| Method     | Signature                                                                           | Returns                           | Description                                |
| ---------- | ----------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `$.step`   | `(config: StepConfig<T>) => Promise<FlowStepResult<T>>`                             | `FlowStepResult<T>`               | Single unit of work                        |
| `$.agent`  | `(config: AgentStepConfig<TInput>) => Promise<FlowAgentStepResult>`                 | `FlowAgentStepResult`             | Agent call as tracked step                 |
| `$.map`    | `(config: MapConfig<T, R>) => Promise<FlowStepResult<R[]>>`                         | `FlowStepResult<R[]>`             | Parallel map with optional concurrency     |
| `$.each`   | `(config: EachConfig<T>) => Promise<FlowStepResult<void>>`                          | `FlowStepResult<void>`            | Sequential side effects                    |
| `$.reduce` | `(config: ReduceConfig<T, R>) => Promise<FlowStepResult<R>>`                        | `FlowStepResult<R>`               | Sequential accumulation                    |
| `$.while`  | `(config: WhileConfig<T>) => Promise<FlowStepResult<T \| undefined>>`               | `FlowStepResult<T \| undefined>`  | Conditional loop                           |
| `$.all`    | `(config: AllConfig) => Promise<FlowStepResult<unknown[]>>`                         | `FlowStepResult<unknown[]>`       | Concurrent heterogeneous ops (Promise.all) |
| `$.race`   | `(config: RaceConfig) => Promise<FlowStepResult<unknown>>`                          | `FlowStepResult<unknown>`         | First-to-finish wins (Promise.race)        |

### StepConfig

```typescript
interface StepConfig<T> {
  id: string;
  execute: (params: { $: StepBuilder }) => Promise<T>;
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: { id: string; result: T; duration: number }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

### AgentStepConfig

```typescript
interface AgentStepConfig<TInput> {
  id: string;
  agent: Agent<TInput>;
  input: TInput;
  config?: Omit<GenerateParams, "input" | "prompt" | "messages">;
  stream?: boolean; // pipe agent text through parent flow stream; default false
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: {
    id: string;
    result: GenerateResult;
    duration: number;
  }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

### MapConfig

```typescript
interface MapConfig<T, R> {
  id: string;
  input: readonly T[];
  concurrency?: number; // default: Infinity
  execute: (params: { item: T; index: number; $: StepBuilder }) => Promise<R>;
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: { id: string; result: R[]; duration: number }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

### EachConfig

```typescript
interface EachConfig<T> {
  id: string;
  input: readonly T[];
  execute: (params: { item: T; index: number; $: StepBuilder }) => Promise<void>;
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: { id: string; duration: number }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

### ReduceConfig

```typescript
interface ReduceConfig<T, R> {
  id: string;
  input: readonly T[];
  initial: R;
  execute: (params: { item: T; accumulator: R; index: number; $: StepBuilder }) => Promise<R>;
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: { id: string; result: R; duration: number }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

### WhileConfig

```typescript
interface WhileConfig<T> {
  id: string;
  condition: (params: { value: T | undefined; index: number }) => boolean;
  execute: (params: { index: number; $: StepBuilder }) => Promise<T>;
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: {
    id: string;
    result: T | undefined;
    duration: number;
  }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

### AllConfig / RaceConfig

```typescript
type EntryFactory = (signal: AbortSignal, $: StepBuilder) => Promise<unknown>;

interface AllConfig {
  id: string;
  entries: EntryFactory[];
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: { id: string; result: unknown[]; duration: number }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}

interface RaceConfig {
  id: string;
  entries: EntryFactory[];
  onStart?: (event: { id: string }) => void | Promise<void>;
  onFinish?: (event: { id: string; result: unknown; duration: number }) => void | Promise<void>;
  onError?: (event: { id: string; error: Error }) => void | Promise<void>;
}
```

## FlowStepResult

```typescript
type FlowStepResult<T> =
  | { ok: true; output: T; stepId: string; stepOperation: OperationType; agentChain?: AgentChainEntry[]; duration: number }
  | { ok: false; error: StepError; stepId: string; stepOperation: OperationType; agentChain?: AgentChainEntry[]; duration: number };

interface StepError extends ResultError {
  stepId: string; // the id from the failed step config
}
```

## TraceEntry

```typescript
interface TraceEntry {
  id: string; // matches the id from the $ config
  type: OperationType;
  input?: unknown;
  output?: unknown;
  startedAt: number; // Unix ms
  finishedAt?: number; // Unix ms; undefined while running
  error?: Error;
  usage?: TokenUsage; // populated for agent-type entries
  children?: readonly TraceEntry[];
}
```

### OperationType values

```typescript
type OperationType = "step" | "agent" | "map" | "each" | "reduce" | "while" | "all" | "race";
```

## StepStartEvent

```typescript
interface StepStartEvent {
  stepId: string;        // from the $ config's `id` field
  stepOperation: OperationType; // 'step' | 'agent' | 'map' | 'each' | 'reduce' | 'while' | 'all' | 'race'
  agentChain?: AgentChainEntry[];
}
```

## StepFinishEvent

Emitted by `onStepFinish`. For agent tool-loop steps, the event is a full superset of the Vercel AI SDK's `StepResult<ToolSet>` — all SDK fields are passed through unchanged, plus funkai-specific additions. For flow `$.agent()` steps, the event carries both flow fields (`output`, `duration`) and the AI SDK fields from the last tool-loop step. Non-agent flow steps (`$.step()`, `$.map()`, etc.) only have the flow-specific fields.

| Field            | Type                        | Present on                          | Description                                    |
| ---------------- | --------------------------- | ----------------------------------- | ---------------------------------------------- |
| `stepId`         | `string`                    | All steps                           | funkai addition: the `$` config `id`           |
| `stepOperation`  | `OperationType`             | All steps                           | funkai addition: operation type                |
| `agentChain`     | `AgentChainEntry[]`         | All steps                           | funkai addition: agent ancestry chain          |
| `stepNumber`     | `number`                    | Agent tool-loop + flow `$.agent()`  | AI SDK: zero-based step index                  |
| `text`           | `string`                    | Agent tool-loop + flow `$.agent()`  | AI SDK: generated text                         |
| `toolCalls`      | `TypedToolCall<ToolSet>[]`  | Agent tool-loop + flow `$.agent()`  | AI SDK: full tool call objects with `input`    |
| `toolResults`    | `TypedToolResult<ToolSet>[]`| Agent tool-loop + flow `$.agent()`  | AI SDK: full tool result objects with `output` |
| `finishReason`   | `FinishReason`              | Agent tool-loop + flow `$.agent()`  | AI SDK: why the step ended                     |
| `usage`          | `LanguageModelUsage`        | Agent tool-loop + flow `$.agent()`  | AI SDK: token usage                            |
| `reasoning`      | `ReasoningPart[]`           | Agent tool-loop + flow `$.agent()`  | AI SDK: reasoning content                      |
| `sources`        | `Source[]`                  | Agent tool-loop + flow `$.agent()`  | AI SDK: cited sources                          |
| `response`       | `LanguageModelResponseMetadata & { messages }` | Agent tool-loop + flow `$.agent()` | AI SDK: response metadata |
| `output`         | `unknown`                   | Flow orchestration steps            | Flow step output value                         |
| `duration`       | `number`                    | Flow orchestration steps            | Flow step duration in ms                       |

## FlowAgentOverrides

```typescript
type FlowAgentOverrides<TInput, TOutput> =
  | Partial<FlowAgentConfig<TInput, TOutput>>
  | ((config: FlowAgentConfig<TInput, TOutput>) => Partial<FlowAgentConfig<TInput, TOutput>>);
```

Scalars replace; the `agents` record is shallow-merged.

## createFlowEngine()

Creates a `flowAgent()`-like factory with additional step types merged into `$` and optional default lifecycle hooks.

```typescript
function createFlowEngine<TCustomSteps extends CustomStepDefinitions>(
  config: FlowEngineConfig<TCustomSteps>,
): FlowFactory<TCustomSteps>;
```

### FlowEngineConfig

| Field          | Type                                                                                      | Description                                   |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `$`            | `TCustomSteps`                                                                            | Map of custom step names to factory functions |
| `onStart`      | `(event: { input: unknown }) => void \| Promise<void>`                                    | Default start hook for all flow agents        |
| `onFinish`     | `(event: { input: unknown; result: unknown; duration: number }) => void \| Promise<void>` | Default finish hook                           |
| `onError`      | `(event: { input: unknown; error: Error }) => void \| Promise<void>`                      | Default error hook                            |
| `onStepStart`  | `(event: StepStartEvent) => void \| Promise<void>`                                        | Default step-start hook                       |
| `onStepFinish` | `(event: StepFinishEvent) => void \| Promise<void>`                                       | Default step-finish hook                      |

### CustomStepFactory

```typescript
type CustomStepFactory<TConfig, TResult> = (params: {
  ctx: ExecutionContext;
  config: TConfig;
}) => Promise<TResult>;
```

Custom step names must not conflict with built-in names: `step`, `agent`, `map`, `each`, `reduce`, `while`, `all`, `race`.

### FlowFactory

The return type of `createFlowEngine()`. Call it exactly like `flowAgent()`:

```typescript
const engine = createFlowEngine({ $: { retry: retryFactory } });

const myFlow = engine(
  { name: "my-flow", input: MyInput, output: MyOutput },
  async ({ input, $ }) => {
    const data = await $.retry({ attempts: 3, execute: async () => fetch("...") });
    return data;
  },
);
```

## evolve()

Creates a new agent or flow agent from an existing one with config overrides. The original is not modified.

```typescript
// Agent overload
function evolve<TInput, TOutput, TTools, TSubAgents, TModel>(
  base: Agent<TInput, TOutput, TTools, TSubAgents, TModel>,
  overrides: AgentOverrides<TInput, TOutput, TTools, TSubAgents, TModel>,
): Agent<TInput, TOutput, TTools, TSubAgents, TModel>;

// FlowAgent overload
function evolve<TInput, TOutput>(
  base: FlowAgent<TInput, TOutput>,
  overrides: FlowAgentOverrides<TInput, TOutput>,
  handler?: FlowAgentHandler<TInput, TOutput>,
): FlowAgent<TInput, TOutput>;
```

**Merge logic:** Scalars replace. Record fields (`tools`, `agents`) are shallow-merged: `{ ...base, ...override }`.

`overrides` can be a partial config object or a mapper function:

```typescript
// Partial config
evolve(base, { name: "reviewer-local", model: openai("gpt-4.1-mini") });

// Mapper function — receives current config
evolve(base, (config) => ({ name: `${config.name}-local` }));
```

## See Also

- [Flow Agents concept](/concepts/flow-agents) — overview with usage examples
- [Multi-Agent Orchestration guide](/guides/multi-agent)
- [`agent()` reference](/reference/agents/agent)
- [`tool()` reference](/reference/agents/tool)
