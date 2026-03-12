# 02 — FlowAgent API Design

## Core Concept

A `flowAgent` is an agent whose behavior is defined by code, not by an LLM.
You write the orchestration logic — calling sub-agents, running steps, using
concurrency primitives — and the framework wraps it in the exact same API
surface as a regular `agent`.

To consumers, a `FlowAgent` IS an `Agent`. Same `.generate()`, same
`.stream()`, same `.fn()`. Same `GenerateResult` return type. Same `messages`
array. The only difference is internal: an `agent` runs an LLM tool loop,
a `flowAgent` runs your handler function.

## Steps as Tool Calls

This is the key design decision. Every `$` step in a flow agent is modeled
as a **synthetic tool call** in the message history. This means:

1. `flowAgent.generate()` returns `GenerateResult<TOutput>` with `messages`
   containing tool-call messages for each step
2. `flowAgent.stream()` returns `StreamResult<TOutput>` with a stream that
   emits tool-call events for each step
3. UI components that render tool calls automatically render flow steps
4. The message history is self-documenting — you can see exactly what happened

### How steps map to messages

Each step execution produces two messages:

```typescript
// Step: $.step({ id: 'fetch-data', execute: () => fetchRepo(url) })
// Produces:

// 1. Assistant message with tool call
{
  role: 'assistant',
  content: [{
    type: 'tool-call',
    toolCallId: 'fetch-data-0',    // step id + index
    toolName: 'fetch-data',         // step id
    args: { url: 'https://...' },   // step input (if provided)
  }]
}

// 2. Tool message with result
{
  role: 'tool',
  content: [{
    type: 'tool-result',
    toolCallId: 'fetch-data-0',
    toolName: 'fetch-data',
    result: { files: ['...'] },     // step output
  }]
}
```

### Nested steps

When steps are nested (e.g., `$.map` calling `$.agent` inside), the tool
calls are flattened into the message array in execution order. The trace
tree still captures the nesting for observability.

### Agent steps

When `$.agent()` calls a sub-agent, the sub-agent's own messages are NOT
inlined into the parent's message array. The sub-agent call appears as a
single tool call/result pair. The sub-agent's internal messages are available
in the trace if needed.

```typescript
// $.agent({ id: 'analyze', agent: analyzer, input: data })
// Produces:

{
  role: 'assistant',
  content: [{
    type: 'tool-call',
    toolCallId: 'analyze-1',
    toolName: 'analyze',
    args: data,                    // input passed to agent
  }]
}

{
  role: 'tool',
  content: [{
    type: 'tool-result',
    toolCallId: 'analyze-1',
    toolName: 'analyze',
    result: agentOutput,           // agent's output
  }]
}
```

### Final output message

After all steps complete, a final assistant message contains the output:

```typescript
{
  role: 'assistant',
  content: JSON.stringify(output),  // or text if string output
}
```

### Complete message array example

```typescript
const result = await myFlowAgent.generate({ repo: 'github.com/...' })

result.messages = [
  // User input
  { role: 'user', content: '{"repo":"github.com/..."}' },

  // Step 1: fetch-data
  { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'fetch-data-0', toolName: 'fetch-data', args: { repo: '...' } }] },
  { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'fetch-data-0', toolName: 'fetch-data', result: { files: [...] } }] },

  // Step 2: analyze (sub-agent call)
  { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'analyze-1', toolName: 'analyze', args: { files: [...] } }] },
  { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'analyze-1', toolName: 'analyze', result: { summary: '...' } }] },

  // Final output
  { role: 'assistant', content: '{"summary":"...","insights":[...]}' },
]
```

---

## API Surface

### `flowAgent()` factory

```typescript
import { flowAgent } from "@funkai/agents";

const pipeline = flowAgent(
  {
    name: "doc-pipeline",
    input: z.object({ repo: z.string() }),
    output: z.object({ docs: z.array(z.string()) }),

    // Optional (same as agent)
    logger: customLogger,
    onStart: ({ input }) => {},
    onFinish: ({ input, result, duration }) => {},
    onError: ({ input, error }) => {},
    onStepFinish: ({ stepId, toolCalls, toolResults, usage }) => {},
  },
  async ({ input, $ }) => {
    // Your orchestration code
    const files = await $.step({
      id: "scan-repo",
      execute: () => scanRepo(input.repo),
    });

    if (!files.ok) throw files.error;

    const docs = await $.map({
      id: "generate-docs",
      input: files.value,
      execute: async ({ item, $ }) => {
        const result = await $.agent({
          id: "write-doc",
          agent: writerAgent,
          input: item,
        });
        return result.ok ? result.value.output : "";
      },
      concurrency: 3,
    });

    return { docs: docs.ok ? docs.value : [] };
  },
);
```

### `FlowAgent` type

```typescript
interface FlowAgent<TInput, TOutput> {
  // Identical to Agent
  generate(input: TInput, config?: FlowAgentOverrides): Promise<Result<GenerateResult<TOutput>>>;

  stream(input: TInput, config?: FlowAgentOverrides): Promise<Result<StreamResult<TOutput>>>;

  fn(): (input: TInput, config?: FlowAgentOverrides) => Promise<Result<GenerateResult<TOutput>>>;
}
```

### `GenerateResult<TOutput>` — shared with `Agent`

```typescript
// SAME type as agent. No separate WorkflowResult.
interface GenerateResult<TOutput> {
  output: TOutput;
  messages: Message[]; // includes synthetic tool calls for steps
  usage: TokenUsage; // aggregated across all sub-agent calls
  finishReason: string; // 'stop' for successful flows
}
```

### Extra data on the result

The `GenerateResult` returned by `flowAgent` carries extra fields beyond
the base interface. TypeScript structural typing means it still satisfies
`GenerateResult<TOutput>` while consumers who know they have a flow agent
can access the extras:

```typescript
interface FlowAgentGenerateResult<TOutput> extends GenerateResult<TOutput> {
  trace: readonly TraceEntry[]; // execution trace tree
  duration: number; // wall-clock ms
}
```

Consumers who only care about the `Runnable` / `Agent` contract see
`{ output, messages, usage, finishReason }`. Consumers who know they
have a `FlowAgent` can access `trace` and `duration`.

### `FlowAgentOverrides`

```typescript
interface FlowAgentOverrides {
  signal?: AbortSignal
  logger?: Logger
  // No model/tools/output overrides — the flow defines its own
  // Per-call hooks:
  onStart?: (event: { input: unknown }) => void | Promise<void>
  onFinish?: (event: { input: unknown; result: GenerateResult; duration: number }) => void | Promise<void>
  onError?: (event: { input: unknown; error: Error }) => void | Promise<void>
  onStepFinish?: (event: { stepId: string; ... }) => void | Promise<void>
}
```

---

## `FlowAgentConfig`

```typescript
interface FlowAgentConfig<TInput, TOutput> {
  name: string;
  input: ZodType<TInput>; // required (typed mode only for flows)
  output: ZodType<TOutput>; // required (validates return value)
  logger?: Logger;

  // Hooks
  onStart?: (event: { input: TInput }) => void | Promise<void>;
  onFinish?: (event: {
    input: TInput;
    result: GenerateResult<TOutput>;
    duration: number;
  }) => void | Promise<void>;
  onError?: (event: { input: TInput; error: Error }) => void | Promise<void>;
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>;
  onStepFinish?: (event: {
    step: StepInfo;
    result: unknown;
    duration: number;
  }) => void | Promise<void>;
}
```

---

## `FlowAgentHandler`

```typescript
type FlowAgentHandler<TInput, TOutput> = (params: {
  input: TInput;
  $: StepBuilder;
  log: Logger;
}) => Promise<TOutput>;
```

---

## Step Builder (`$`) — mostly unchanged

The `$` step builder keeps its current API. The key change is that each step
now also produces synthetic messages that get collected into the result.

```typescript
interface StepBuilder {
  step<T>(config: StepConfig<T>): Promise<StepResult<T>>;
  agent<TInput>(config: AgentStepConfig<TInput>): Promise<StepResult<GenerateResult>>;
  map<T, R>(config: MapConfig<T, R>): Promise<StepResult<R[]>>;
  each<T>(config: EachConfig<T>): Promise<StepResult<void>>;
  reduce<T, R>(config: ReduceConfig<T, R>): Promise<StepResult<R>>;
  while<T>(config: WhileConfig<T>): Promise<StepResult<T | undefined>>;
  all(config: AllConfig): Promise<StepResult<unknown[]>>;
  race(config: RaceConfig): Promise<StepResult<unknown>>;
}
```

### Message collection

The `Context` gains a `messages: Message[]` array alongside the existing
`trace: TraceEntry[]`. Each step pushes its synthetic tool-call messages
to this array. After the handler completes, the flow agent assembles the
full message array:

```typescript
interface Context extends ExecutionContext {
  readonly trace: TraceEntry[];
  readonly messages: Message[]; // NEW: synthetic messages from steps
}
```

---

## Runnable interface — unchanged

Both `Agent` and `FlowAgent` satisfy `Runnable`:

```typescript
interface Runnable<TInput, TOutput> {
  generate(input: TInput, config?: any): Promise<Result<{ output: TOutput }>>;
  stream(input: TInput, config?: any): Promise<Result<StreamResult<TOutput>>>;
  fn(): (input: TInput, config?: any) => Promise<Result<{ output: TOutput }>>;
}

// StreamResult uses AI SDK types directly:
interface StreamResult<TOutput> {
  output: Promise<TOutput>;
  messages: Promise<Message[]>;
  usage: Promise<TokenUsage>;
  finishReason: Promise<string>;
  fullStream: AsyncIterableStream<StreamPart>; // typed events, not raw strings
}
```

This means flow agents work anywhere agents work — as sub-agents, in
`$.agent()` calls, as tool-wrapped delegatees, etc.

---

## Comparison: before and after

### Before (workflow)

```typescript
import { workflow } from "@funkai/agents";

const w = workflow(
  {
    name: "analyze",
    input: z.object({ text: z.string() }),
    output: z.object({ summary: z.string() }),
  },
  async ({ input, $ }) => {
    const r = await $.agent({ id: "summarize", agent: summarizer, input: input.text });
    return { summary: r.ok ? r.value.output : "" };
  },
);

const result = await w.generate({ text: "..." });
// result.output   — the output
// result.trace    — execution trace
// result.usage    — token usage
// result.duration — timing
// result.messages — DOES NOT EXIST
```

### After (flowAgent)

```typescript
import { flowAgent } from "@funkai/agents";

const analyze = flowAgent(
  {
    name: "analyze",
    input: z.object({ text: z.string() }),
    output: z.object({ summary: z.string() }),
  },
  async ({ input, $ }) => {
    const r = await $.agent({ id: "summarize", agent: summarizer, input: input.text });
    return { summary: r.ok ? r.value.output : "" };
  },
);

const result = await analyze.generate({ text: "..." });
// result.output       — the output (same)
// result.messages     — tool-call messages for each step (NEW)
// result.usage        — token usage (same)
// result.finishReason — 'stop' (NEW, matches Agent)
// result.trace        — execution trace (still available)
// result.duration     — timing (still available)
```
