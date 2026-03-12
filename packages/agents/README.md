# @pkg/agent-sdk

Lightweight agent orchestration framework built on the [Vercel AI SDK](https://ai-sdk.dev/).

## Principles

1. **Functions all the way down** -- `agent`, `tool`, `workflow` are functions that return plain objects.
2. **Composition over configuration** -- combine small pieces instead of configuring large ones.
3. **Closures are state** -- workflow state is just `let` variables in your handler.
4. **Result, never throw** -- every public method returns `Result<T>`. Pattern-match on `ok` instead of try/catch.
5. **`$` is optional sugar** -- the `$` helpers register data flow for observability; plain imperative code works too.

## Quick Start

### Agent

```typescript
import { agent, tool } from '@pkg/agent-sdk'
import { z } from 'zod'

// Simple mode -- pass a string directly
const helper = agent({
  name: 'helper',
  model: 'openai/gpt-4.1',
  system: 'You are a helpful assistant.',
})

const result = await helper.generate('What is TypeScript?')

if (!result.ok) {
  console.error(result.error.code, result.error.message)
} else {
  console.log(result.output) // string
  console.log(result.messages) // full message history
}

// Typed mode -- input schema + prompt template
const summarizer = agent({
  name: 'summarizer',
  model: 'openai/gpt-4.1',
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize the following:\n\n${input.text}`,
})

const summary = await summarizer.generate({ text: 'A long article...' })
```

### Tool

```typescript
import { tool } from '@pkg/agent-sdk'
import { z } from 'zod'

const fetchPage = tool({
  description: 'Fetch the contents of a web page by URL',
  inputSchema: z.object({ url: z.url() }),
  execute: async ({ url }) => {
    const res = await fetch(url)
    return { url, status: res.status, body: await res.text() }
  },
})
```

### Workflow

```typescript
import { workflow } from '@pkg/agent-sdk'
import { z } from 'zod'

const InputSchema = z.object({ topic: z.string() })
const OutputSchema = z.object({ summary: z.string(), sources: z.array(z.string()) })

const research = workflow(
  {
    name: 'research',
    input: InputSchema,
    output: OutputSchema,
  },
  async ({ input, $ }) => {
    // State is just variables
    let sources: string[] = []

    // $.step -- tracked unit of work
    const data = await $.step({
      id: 'fetch-sources',
      execute: async () => findSources(input.topic),
    })
    if (data.ok) sources = data.value

    // $.agent -- run an agent as a tracked step
    const analysis = await $.agent({
      id: 'summarize',
      agent: summarizer,
      input: { text: sources.join('\n') },
    })

    return {
      summary: analysis.ok ? analysis.output : 'Failed to summarize',
      sources,
    }
  }
)

const result = await research.generate({ topic: 'Effect systems' })
```

## Public API

| Export                         | Description                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `agent(config)`                | Create an agent. Returns `{ generate, stream, fn }`.                                    |
| `tool(config)`                 | Create a tool for function calling.                                                     |
| `workflow(config, handler)`    | Create a workflow with typed I/O and tracked steps. Returns `{ generate, stream, fn }`. |
| `createWorkflowEngine(config)` | Create a workflow factory with shared configuration and custom step types.              |
| `openrouter(modelId)`          | Shorthand to create an OpenRouter language model from env key.                          |
| `createOpenRouter(options?)`   | Create a reusable OpenRouter provider instance.                                         |

## Result Type

Every `generate()` call returns `Result<T>` -- a discriminated union where success fields are flat on the object:

```typescript
type Result<T> = (T & { ok: true }) | { ok: false; error: ResultError }
```

```typescript
const result = await myAgent.generate('hello')

if (!result.ok) {
  // result.error.code    -- machine-readable code
  // result.error.message -- human-readable description
  return
}

// Success -- fields from GenerateResult are directly on result
result.output // TOutput
result.messages // Message[]
```

## Step Builder (`$`)

Inside a workflow handler, `$` provides tracked operations:

| Method             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `$.step(config)`   | Execute a single unit of work.                            |
| `$.agent(config)`  | Run an agent call as a tracked step.                      |
| `$.map(config)`    | Parallel map over an array.                               |
| `$.each(config)`   | Sequential side effects.                                  |
| `$.reduce(config)` | Sequential accumulation.                                  |
| `$.while(config)`  | Conditional loop.                                         |
| `$.all(config)`    | Concurrent heterogeneous operations (like `Promise.all`). |
| `$.race(config)`   | First to finish wins, losers are cancelled.               |

`$.all()` and `$.race()` take **factory functions** `(signal: AbortSignal) => Promise<any>`, not pre-started promises. This lets the framework control timing and cancel losers via the abort signal.

## Streaming

Both agents and workflows support streaming:

```typescript
// Agent streaming
const result = await helper.stream('Explain closures')
if (result.ok) {
  for await (const chunk of result.stream) {
    process.stdout.write(chunk)
  }
  const finalOutput = await result.output // resolves after stream ends
  const messages = await result.messages // resolves after stream ends
}

// Workflow streaming -- emits StepEvent objects
const result = await research.stream({ topic: 'Closures' })
if (result.ok) {
  for await (const event of result.stream) {
    console.log(event.type) // step:start, step:finish, workflow:finish, ...
  }
}
```

## Documentation

For comprehensive documentation, see [docs/overview.md](docs/overview.md).
