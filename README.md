> [!CAUTION]
> **Joggr is shut down.** This repository is archived and unmaintained.
> Do not depend on it for production use.
>
> The published npm package remains available but will receive no further updates.

---

<div align="center">
  <img src="assets/banner.svg" alt="funkai" width="100%" />
  <p><strong>A composable AI microframework built on <a href="https://github.com/vercel/ai">ai-sdk</a>, curried with funk-tional programming flair.</strong></p>

<a href="https://github.com/joggrdocs/funkai/actions/workflows/ci.yml"><img src="https://github.com/joggrdocs/funkai/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
<a href="https://www.npmjs.com/package/@funkai/agents"><img src="https://img.shields.io/npm/v/@funkai/agents" alt="npm version" /></a>
<a href="https://github.com/joggrdocs/funkai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/joggrdocs/funkai" alt="License" /></a>

</div>

## Features

- :zap: **Functions all the way down** — `agent`, `tool`, `flowAgent` are functions returning plain objects.
- :jigsaw: **Composition over configuration** — Combine small pieces instead of configuring large ones.
- :shield: **Result, never throw** — Every public method returns `Result<T>`.
- :lock: **Closures are state** — Flow agent state is just variables in your handler.
- :triangular_ruler: **Type-driven design** — Zod schemas, discriminated unions, exhaustive matching.

## Install

```bash
npm install @funkai/agents @funkai/prompts
```

## Usage

### Create an agent

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  system: "You are a helpful writer.",
  tools: { search },
});

const result = await writer.generate({ prompt: "Write about closures" });
```

### Define a prompt

```
---
name: writer
schema:
  tone: string
---
You are a {{ tone }} writer.
```

### Generate typed prompts

```bash
npx funkai prompts generate --out .prompts/client --includes "src/agents/**"
```

## Packages

| Package                               | Description                                                          |
| ------------------------------------- | -------------------------------------------------------------------- |
| [`@funkai/agents`](packages/agents)   | Lightweight agent, tool, and flow agent orchestration                |
| [`@funkai/models`](packages/models)   | Model catalog, provider resolution, and cost calculations            |
| [`@funkai/prompts`](packages/prompts) | Prompt SDK with LiquidJS templating, Zod validation, and CLI codegen |
| [`@funkai/cli`](packages/cli)         | CLI for the funkai prompt SDK                                        |

## License

[MIT](LICENSE)