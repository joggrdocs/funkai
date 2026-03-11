# realworld-cli

A realistic CLI example that uses an AI agent pipeline to scan a codebase for poorly written unit tests.

## Architecture

```
                          POST /analyze
CLI (@clack/prompts) ──────────────────────→ Hono API (agents + LLM)
                     ←── SSE: tool-execute ──┘
                     ──→ POST /tool-result ──→  (resumes agent)
                     ←── SSE: text-delta ────┘
                     ←── SSE: analysis ──────┘
                     ←── SSE: done ──────────┘
```

- **API server** (`api/`) — Hosts the agent pipeline (scanner + analyzer) and makes LLM calls via OpenRouter. When an agent decides to call a tool (`ls`, `grep`, `read-file`), the API sends a `tool-execute` SSE event to the CLI and **waits** for the result.
- **CLI client** (`cli/`) — Owns the filesystem. Receives `tool-execute` events, runs the tool locally against the user's codebase, and POSTs the result back to `/tool-result`. Streams all agent activity (tool calls, text output, step progress) to the terminal using `@clack/prompts`. Writes a markdown report to `./reports/` when complete.
- **Fixtures** (`fixtures/`) — Sample source code and intentionally bad tests so the demo works out of the box.
- **Shared** (`shared/`) — SSE event types and tool result payload shared between API and CLI.

This pattern mirrors real-world deployments where the AI server is remote but tools execute locally.

## Setup

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

## Reports

After analysis completes, the CLI writes a markdown report to `./reports/<timestamp>.md` containing each file's analysis summary, issue counts, and the full scan metadata.

## SSE event flow

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

## Turbo pipeline

The package-level `turbo.json` wires up the build dependencies:

```
^build (agents, prompts, cli) → prompts:generate → build / typecheck / dev
```

- `prompts:generate` runs automatically before build, typecheck, and dev
- `dev` is persistent and uncached (nodemon watches for changes)
- `cli` depends on `build` so the dist is always fresh

## What the agents find

The fixture tests contain these intentional issues:

| File                   | Issues                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `math.test.ts`         | No assertions, wrong expected values, missing error path tests, no factorial coverage                                    |
| `user-service.test.ts` | Tests implementation details (UUID format, Date timing), missing coverage for most functions                             |
| `string-utils.test.ts` | Vague descriptions, missing assertions, wrong expected values, redundant tests, no coverage for `isValidEmail`/`slugify` |
