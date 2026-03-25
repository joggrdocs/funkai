# Prompts with Sub-Agents

A multi-agent content pipeline where each sub-agent's system prompt is defined as a `.prompt` file with typed codegen.

## What You'll Learn

- Using `.prompt` files to define system prompts for multiple sub-agents
- Composing a `flowAgent` pipeline: researcher, writer, reviewer
- Passing typed prompt parameters to each agent's system prompt via `render()`
- Chaining agent outputs through sequential flow steps with `$.agent()`

## Packages Used

- `@funkai/agents` — `agent`, `flowAgent`
- `@funkai/prompts` — Prompt runtime (LiquidJS rendering, Zod validation)
- `@funkai/cli` — `funkai prompts generate` codegen command
- `@ai-sdk/openai` — OpenAI provider
- `zod` — Input/output validation

## Prerequisites

Set your OpenAI API key (or configure OpenRouter):

```bash
export OPENAI_API_KEY="sk-..."
```

## Usage

```bash
# From the monorepo root

# Generate the typed prompt client (runs automatically before build)
pnpm prompts:generate --filter=@funkai/example-prompts-subagents

# Run the example
pnpm start --filter=@funkai/example-prompts-subagents
```

## How It Works

1. Three `.prompt` files define system prompts for a `researcher`, `writer`, and `reviewer` agent
2. `funkai prompts generate` produces typed clients — each prompt has its own render function with validated parameters
3. A `flowAgent` orchestrates the three agents sequentially:
   - **Research** — the researcher gathers information on the input topic
   - **Draft** — the writer produces an article from the research findings
   - **Review** — the reviewer evaluates the draft against a quality standard
4. The flow returns the final `article` and `verdict`, plus a full execution trace
