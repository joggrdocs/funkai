# Real-World CLI

A realistic CLI application that uses an AI agent pipeline to scan a codebase for poorly written unit tests. Demonstrates a client/server architecture where the AI runs remotely but tools execute locally.

## What You'll Learn

- Building a multi-agent pipeline with `flowAgent` (scanner + analyzer)
- Server-Sent Events (SSE) for real-time streaming between API and CLI
- Remote agent execution with local tool execution (tools run on the client's filesystem)
- Using `.prompt` files with codegen for agent system prompts
- Writing markdown reports from agent output

## Packages Used

- `@funkai/agents` — `agent`, `flowAgent`, `tool`
- `@funkai/prompts` — Prompt runtime (LiquidJS rendering, Zod validation)
- `@funkai/cli` — `funkai prompts generate` codegen command
- `@ai-sdk/openai` — OpenAI provider
- `zod` — Input/output validation
- `hono` — API server
- `@clack/prompts` — CLI interface

## Prerequisites

Set your OpenAI API key (or configure OpenRouter):

```bash
# From the monorepo root
pnpm install

# Copy and fill in your API key
cp examples/realworld-cli/.env.example examples/realworld-cli/.env
```

## Usage

### Development (auto-rebuild on change)

```bash
# Start the API server with nodemon (watches api/ and shared/, rebuilds + restarts)
pnpm dev --filter=@funkai/example-realworld-cli

# In another terminal — run the CLI
pnpm start:cli --filter=@funkai/example-realworld-cli
```

### Quick test (from built dist/)

```bash
# Build everything first
pnpm build --filter=@funkai/example-realworld-cli

# Start the API server
pnpm start:api --filter=@funkai/example-realworld-cli

# In another terminal — run the built CLI directly
pnpm cli --filter=@funkai/example-realworld-cli
```

The CLI prompts for a directory to scan. Enter `./fixtures` (default) to analyze the included bad tests, or any other path relative to your current working directory.

## How It Works

### Architecture

```
                          POST /analyze
CLI (@clack/prompts) ──────────────────────→ Hono API (agents + LLM)
                     ←── SSE: tool-execute ──┘
                     ──→ POST /tool-result ──→  (resumes agent)
                     ←── SSE: text-delta ────┘
                     ←── SSE: analysis ──────┘
                     ←── SSE: done ──────────┘
```

- **API server** (`api/`) — Hosts the agent pipeline (scanner + analyzer) and makes LLM calls via OpenRouter. When an agent decides to call a tool (`ls`, `grep`, `read-file`), the API sends a `tool-execute` SSE event to the CLI and waits for the result.
- **CLI client** (`cli/`) — Owns the filesystem. Receives `tool-execute` events, runs the tool locally against the user's codebase, and POSTs the result back to `/tool-result`. Streams all agent activity to the terminal using `@clack/prompts`. Writes a markdown report to `./reports/` when complete.
- **Fixtures** (`fixtures/`) — Sample source code and intentionally bad tests so the demo works out of the box.
- **Shared** (`shared/`) — SSE event types and tool result payload shared between API and CLI.

### SSE event flow

| Event           | Direction | Description                                |
| --------------- | --------- | ------------------------------------------ |
| `step:start`    | API → CLI | Pipeline step began (scan or analyze)      |
| `tool-execute`  | API → CLI | Agent needs a tool run locally             |
| `tool-result`   | CLI → API | Local tool execution result (POST)         |
| `tool-call`     | API → CLI | Agent invoked a tool (stream notification) |
| `text-delta`    | API → CLI | Streamed text from an agent                |
| `scan-complete` | API → CLI | Scanner found test files                   |
| `analysis`      | API → CLI | Single file analysis finished              |
| `step:finish`   | API → CLI | Pipeline step completed with duration      |
| `done`          | API → CLI | Pipeline finished with totals              |
| `error`         | API → CLI | Error occurred                             |

### What the agents find

The fixture tests contain these intentional issues:

| File                   | Issues                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `math.test.ts`         | No assertions, wrong expected values, missing error path tests, no factorial coverage                                    |
| `user-service.test.ts` | Tests implementation details (UUID format, Date timing), missing coverage for most functions                             |
| `string-utils.test.ts` | Vague descriptions, missing assertions, wrong expected values, redundant tests, no coverage for `isValidEmail`/`slugify` |
