# Basic Agent

A minimal example showing how to create an agent with tools and use `evolve()` to derive new agents with different configurations.

## What You'll Learn

- Creating an agent with `agent()` and a tool with `tool()`
- Defining a Zod input schema for tools
- Using `evolve()` to derive a new agent with a different model or dynamic system prompt
- Calling `agent.generate()` and handling the result

## Packages Used

- `@funkai/agents` — `agent`, `evolve`, `tool`
- `@ai-sdk/openai` — OpenAI provider
- `zod` — Tool input validation

## Prerequisites

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."
```

Or create a `.env` file in the example directory with `OPENAI_API_KEY=sk-...`.

## Usage

```bash
# From the monorepo root
pnpm start --filter=@funkai/example-basic-agent
```

## How It Works

1. A `weatherTool` is defined with a Zod schema and a simulated `execute` function
2. A base `weatherAgent` is created with `gpt-4o-mini`, a system prompt, and the tool
3. `evolve()` derives a `smartWeatherAgent` that uses `gpt-4.1` and a dynamic system prompt that changes based on the input
4. Both agents are called with `generate()` — results include `output`, `messages`, and `usage`
