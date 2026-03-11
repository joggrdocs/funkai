# agent()

`agent()` creates an `Agent` that wraps the AI SDK's tool loop (`generateText`/`streamText`) with typed input, subagents, hooks, and `Result` return types.

## Signature

```ts
function agent<TInput, TOutput, TTools, TSubAgents>(
  config: AgentConfig<TInput, TOutput, TTools, TSubAgents>
): Agent<TInput, TOutput, TTools, TSubAgents>
```

## AgentConfig

| Field          | Required | Type                                                            | Description                                                 |
| -------------- | -------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `name`         | Yes      | `string`                                                        | Unique agent name (used in logs, traces, hooks)             |
| `model`        | Yes      | `Model` (string ID or `LanguageModel`)                          | Model to use for generation                                 |
| `input`        | No       | `ZodType<TInput>`                                               | Zod schema for typed input (requires `prompt`)              |
| `prompt`       | No       | `(params: { input: TInput }) => string \| Message[]`            | Render typed input into the model prompt (requires `input`) |
| `system`       | No       | `string \| ((params: { input: TInput }) => string)`             | System prompt (static or dynamic)                           |
| `tools`        | No       | `TTools` (Record of `Tool`)                                     | Tools for function calling                                  |
| `agents`       | No       | `TSubAgents` (Record of `Agent`)                                | Subagents, auto-wrapped as callable tools                   |
| `maxSteps`     | No       | `number`                                                        | Max tool-loop iterations (default: `20`)                    |
| `output`       | No       | `OutputParam`                                                   | Output type strategy (see below)                            |
| `logger`       | No       | `Logger`                                                        | Pino-compatible logger                                      |
| `onStart`      | No       | `(event: { input }) => void \| Promise<void>`                   | Hook: fires when the agent starts                           |
| `onFinish`     | No       | `(event: { input, result, duration }) => void \| Promise<void>` | Hook: fires on success                                      |
| `onError`      | No       | `(event: { input, error }) => void \| Promise<void>`            | Hook: fires on error                                        |
| `onStepFinish` | No       | `(event: { stepId }) => void \| Promise<void>`                  | Hook: fires after each tool-loop step                       |

### Two Modes

| Config                 | `.generate()` first param | How prompt is built            |
| ---------------------- | ------------------------- | ------------------------------ |
| `input` + `prompt` set | Typed `TInput`            | `prompt({ input })` renders it |
| Both omitted           | `string \| Message[]`     | Passed directly to the model   |

`input` and `prompt` are required together -- providing one without the other is a type error.

### Output

The `output` field accepts an AI SDK `Output` strategy or a raw Zod schema:

- `Output.text()` -- plain string (default when omitted)
- `Output.object({ schema })` -- validated structured object
- `Output.array({ element })` -- validated array
- `Output.choice({ options })` -- enum/classification
- `z.object({ ... })` -- auto-wrapped as `Output.object({ schema })`
- `z.array(z.object({ ... }))` -- auto-wrapped as `Output.array({ element })`

## Agent Interface

```ts
interface Agent<TInput, TOutput, TTools, TSubAgents> {
  generate(
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>
  ): Promise<Result<GenerateResult<TOutput>>>
  stream(
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>
  ): Promise<Result<StreamResult<TOutput>>>
  fn(): (
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>
  ) => Promise<Result<GenerateResult<TOutput>>>
}
```

### generate()

Runs the agent to completion. Returns `Result<GenerateResult<TOutput>>`.

```ts
interface GenerateResult<TOutput = string> {
  output: TOutput // the generation output
  messages: Message[] // full message history including tool calls
  usage: TokenUsage // aggregated token usage across all tool-loop steps
  finishReason: string // why the model stopped ('stop', 'length', 'tool-calls', etc.)
}
```

On success, `result.ok` is `true` and `output`/`messages` are flat on the result object. On failure, `result.ok` is `false` and `result.error` contains a `ResultError`.

### stream()

Runs the agent with streaming output. Returns `Result<StreamResult<TOutput>>`.

```ts
interface StreamResult<TOutput = string> {
  output: Promise<TOutput> // resolves after stream completes
  messages: Promise<Message[]> // resolves after stream completes
  usage: Promise<TokenUsage> // resolves after stream completes
  finishReason: Promise<string> // resolves after stream completes
  stream: ReadableStream<string> // live text deltas
}
```

The `stream` is available immediately. Consume it for incremental output. Await `output` and `messages` after the stream ends.

### fn()

Returns a plain function with the same signature as `.generate()`. Use for clean single-function exports.

## AgentOverrides

Per-call overrides passed as the optional second parameter to `.generate()` or `.stream()`. Override fields replace the base config for that call only.

| Field          | Type                                          | Description                     |
| -------------- | --------------------------------------------- | ------------------------------- |
| `model`        | `Model`                                       | Override the model              |
| `system`       | `string \| ((params) => string)`              | Override the system prompt      |
| `tools`        | `Partial<TTools> & Record<string, Tool>`      | Merge with base tools           |
| `agents`       | `Partial<TSubAgents> & Record<string, Agent>` | Merge with base subagents       |
| `maxSteps`     | `number`                                      | Override max tool-loop steps    |
| `output`       | `OutputParam`                                 | Override the output strategy    |
| `signal`       | `AbortSignal`                                 | Abort signal for cancellation   |
| `logger`       | `Logger`                                      | Override the logger             |
| `onStart`      | hook                                          | Per-call hook, fires after base |
| `onFinish`     | hook                                          | Per-call hook, fires after base |
| `onError`      | hook                                          | Per-call hook, fires after base |
| `onStepFinish` | hook                                          | Per-call hook, fires after base |

Per-call hooks **merge** with base hooks -- base fires first, then call-level. Both are independently swallowed on error (via `attemptEachAsync`).

## Subagents

Agents declared in the `agents` field are automatically wrapped as tools that the parent agent can invoke through function calling. Abort signals propagate automatically from parent to child.

```ts
const researcher = agent({
  name: 'researcher',
  model: 'openai/gpt-4.1',
  system: 'You research topics thoroughly.',
})

const writer = agent({
  name: 'writer',
  model: 'openai/gpt-4.1',
  system: 'You are a technical writer. Delegate research to the researcher agent.',
  agents: { researcher },
})
```

## Examples

### Simple agent

```ts
const helper = agent({
  name: 'helper',
  model: 'openai/gpt-4.1',
  system: 'You are a helpful assistant.',
})

const result = await helper.generate('What is TypeScript?')
if (result.ok) {
  console.log(result.output) // string
}
```

### Typed agent

```ts
const summarizer = agent({
  name: 'summarizer',
  model: 'openai/gpt-4.1',
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize the following:\n\n${input.text}`,
})

const result = await summarizer.generate({ text: 'Long article...' })
```

### Agent with tools

```ts
const search = tool({
  description: 'Search the web',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => webSearch(query),
})

const assistant = agent({
  name: 'assistant',
  model: 'openai/gpt-4.1',
  system: 'You are a helpful assistant with web search.',
  tools: { search },
})
```

### Agent with subagents

```ts
const analyst = agent({
  name: 'analyst',
  model: 'openai/gpt-4.1',
  system: 'You analyze data. Delegate searches to the searcher.',
  agents: { searcher: searchAgent },
})
```

### Streaming

```ts
const result = await helper.stream('Tell me a story')
if (result.ok) {
  for await (const chunk of result.stream) {
    process.stdout.write(chunk)
  }
  const finalOutput = await result.output
}
```

### Inline overrides

```ts
const result = await helper.generate('Explain quantum computing', {
  model: 'anthropic/claude-sonnet-4',
  maxSteps: 5,
  onFinish: ({ duration }) => console.log(`Took ${duration}ms`),
})
```

## References

- [Core Overview](overview.md)
- [Hooks](hooks.md)
- [Tools](tools.md)
- [Guide: Create an Agent](../guides/create-agent.md)
