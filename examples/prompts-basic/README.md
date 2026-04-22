# Prompts Basic

A minimal example showing how to use `.prompt` files with build-time codegen to create type-safe, templatized system prompts.

## What You'll Learn

- Writing `.prompt` files with YAML frontmatter and LiquidJS templates
- Running `prompts:generate` to produce typed TypeScript modules
- Importing the generated prompt registry with `~prompts`
- Rendering a prompt with typed parameters via `prompts.agents.writer.render()`

## Packages Used

- `@funkai/agents` — `agent`
- `@funkai/prompts` — Prompt runtime (LiquidJS rendering, Zod validation)
- `@funkai/cli` — `funkai prompts generate` codegen command
- `@ai-sdk/openai` — OpenAI provider

## Prerequisites

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."
```

Or create a `.env` file in the example directory with `OPENAI_API_KEY=sk-...`.

## Usage

```bash
# From the monorepo root

# Generate the typed prompt client (runs automatically before build)
pnpm prompts:generate --filter=@funkai/example-prompts-basic

# Run the example
pnpm start --filter=@funkai/example-prompts-basic
```

## How It Works

1. A `.prompt` file at `src/agents/writer/prompt.prompt` defines the system prompt with YAML frontmatter (name, description, input schema) and a LiquidJS template body
2. `funkai prompts generate` reads the `.prompt` file and outputs a typed TypeScript client to `.prompts/client/`
3. The source code imports the generated registry as `~prompts` and calls `prompts.agents.writer.render({ tone, context })` to produce the system prompt string
4. The rendered string is passed as the `system` prompt to an `agent()` call
