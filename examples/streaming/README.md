# Streaming

Demonstrates streaming for both regular agents and flow agents using the typed `fullStream` API.

## What You'll Learn

- Streaming agent responses with `agent.stream()` and consuming `fullStream`
- Handling typed `StreamPart` events: `text-delta`, `tool-call`, `tool-result`, `finish`, `error`
- Using `onStepFinish` hooks during streaming for real-time tool call observation
- Streaming flow agents with `$.agent({ stream: true })` to pipe sub-agent text through the flow's stream
- Accessing `usage` and `messages` from stream results

## Packages Used

- `@funkai/agents` — `agent`, `flowAgent`, `tool`
- `@ai-sdk/openai` — OpenAI provider
- `zod` — Input/output validation

## Prerequisites

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."
```

Or create a `.env` file in the example directory with `OPENAI_API_KEY=sk-...`.

## Usage

```bash
# From the monorepo root
pnpm start --filter=@funkai/example-streaming
```

## How It Works

### Agent streaming

1. A `geographyAgent` is created with a `lookup-capital` tool and an `onStepFinish` hook
2. `agent.stream()` returns a `fullStream` async iterable of typed `StreamPart` events
3. Text deltas are written to stdout as they arrive; tool calls and results are logged inline

### Flow agent streaming

1. A `researchFlow` uses `$.map` to research multiple topics in parallel
2. Each `$.agent()` call uses `stream: true` to pipe sub-agent text through the flow's stream
3. The flow's `fullStream` emits step-level events (`tool-call`, `tool-result`) alongside `text-delta` events
4. After the stream completes, `output` and `messages` are available as resolved promises
