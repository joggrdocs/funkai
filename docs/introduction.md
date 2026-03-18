# Introduction

funkai is a composable, functional TypeScript microframework for AI agent orchestration. It is built on the [Vercel AI SDK](https://ai-sdk.dev) -- not a replacement, but a composition layer on top of it.

## The problem

The AI SDK gives you powerful primitives like `generateText` and `streamText`. But when you start building real applications, you need more: typed agents with validated I/O, multi-step orchestration with observable traces, consistent error handling that does not rely on try/catch, and a model catalog for cost tracking. funkai adds all of this without introducing classes or hidden state.

## Two core primitives

funkai provides two agent primitives that share the same `Runnable` interface:

- **`agent()`** -- A single LLM boundary with a tool loop. Wraps `generateText`/`streamText` with typed input, tools, subagents, hooks, and `Result`-based error handling. Use this when a single model call (with optional tool iterations) is sufficient.

- **`flowAgent()`** -- Multi-step, code-driven orchestration. Your handler function receives `{ input, $, log }` where `$` is the StepBuilder providing traced operations like `$.step()`, `$.agent()`, `$.map()`, and `$.reduce()`. Use this when you need to coordinate multiple agents, run parallel work, or implement custom control flow.

Both return `Result<T>` from every public method -- a discriminated union you pattern-match on `ok` instead of catching exceptions.

## Packages

| Package | Name | Description |
|---|---|---|
| `@funkai/agents` | Agents | Agent orchestration -- `agent()`, `flowAgent()`, `tool()`, `Result` utilities |
| `@funkai/models` | Models | Model catalog, provider registry, and cost calculation |
| `@funkai/prompts` | Prompts | Build-time prompt templating with LiquidJS and Zod validation |
| `@funkai/cli` | CLI | Command-line tooling for prompt generation, linting, and setup |

## Design at a glance

```typescript
import { agent, flowAgent, tool } from '@funkai/agents'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Single LLM boundary
const writer = agent({
  name: 'writer',
  model: openai('gpt-4.1'),
  system: 'You write concise technical docs.',
})

// Multi-step orchestration
const pipeline = flowAgent({
  name: 'pipeline',
  input: z.object({ topics: z.array(z.string()) }),
  output: z.object({ docs: z.array(z.string()) }),
}, async ({ input, $ }) => {
  const docs = await $.map({
    id: 'write-docs',
    input: input.topics,
    execute: async ({ item, $ }) => {
      const result = await $.agent({ id: 'write', agent: writer, input: item })
      return result.ok ? result.value.output : ''
    },
    concurrency: 3,
  })
  return { docs: docs.ok ? docs.value : [] }
})

// Both satisfy Runnable -- same .generate(), .stream(), .fn()
const result = await pipeline.generate({ topics: ['TypeScript', 'Zod'] })
if (result.ok) {
  console.log(result.output)
}
```

## Next steps

- [Quick Start](./quick-start.md) -- Install and build your first agent in minutes.
- [Principles](./principles.md) -- The design philosophy behind funkai.
- [Architecture](./architecture.md) -- How the packages fit together.
