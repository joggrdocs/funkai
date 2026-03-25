# Flow Agent Steps

A comprehensive demo of every `$` step type available in flow agents — no LLM calls required.

## What You'll Learn

- `$.step` — a single tracked unit of work
- `$.map` — parallel map with optional concurrency
- `$.each` — sequential side effects
- `$.reduce` — sequential accumulation
- `$.while` — conditional loop
- `$.all` — concurrent heterogeneous operations (`Promise.all`)
- `$.race` — first-to-finish wins (`Promise.race`)

## Packages Used

- `@funkai/agents` — `flowAgent`
- `zod` — Input/output validation

## Prerequisites

No API keys needed. This example uses only local computation.

## Usage

```bash
# From the monorepo root
pnpm start --filter=@funkai/example-flow-agent-steps
```

## How It Works

1. A `flowAgent` accepts an array of numbers as input
2. `$.step` validates the input
3. `$.map` doubles each number in parallel (concurrency of 3)
4. `$.each` logs each doubled value sequentially
5. `$.reduce` sums the doubled values
6. `$.while` runs a countdown loop with a condition guard
7. `$.all` runs two async tasks concurrently
8. `$.race` races two tasks — the fastest result wins
9. The flow returns all results as a typed output, with a full execution trace
