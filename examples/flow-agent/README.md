# Flow Agent

A multi-step flow agent that orchestrates sub-agents sequentially — summarize text, then translate the summary.

## What You'll Learn

- Creating a `flowAgent()` with typed input/output schemas
- Orchestrating sub-agents with `$.agent()`
- Using `onStepStart` and `onStepFinish` hooks for observability
- Accessing `duration` and `trace` from the flow result

## Packages Used

- `@funkai/agents` — `agent`, `flowAgent`
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
pnpm start --filter=@funkai/example-flow-agent
```

## How It Works

1. Two sub-agents are defined: a `summarizer` and a `translator`
2. A `flowAgent` composes them into a pipeline: summarize first, then translate the summary to Spanish
3. Each `$.agent()` call is a tracked step — hooks fire on start/finish with timing info
4. The flow returns a typed output with `summary` and `translation`, plus `duration` and `trace` for observability
