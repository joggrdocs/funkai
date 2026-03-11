<div align="center">
  <p><strong>@funkai/agents</strong></p>
  <p>Lightweight workflow and agent orchestration framework built on the <a href="https://github.com/vercel/ai">Vercel AI SDK</a>.</p>

<a href="https://www.npmjs.com/package/@funkai/agents"><img src="https://img.shields.io/npm/v/@funkai/agents" alt="npm version" /></a>
<a href="https://github.com/joggrdocs/funkai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/joggrdocs/funkai" alt="License" /></a>

</div>

## Features

- :zap: **Functions all the way down** — `agent`, `tool`, `workflow` are functions that return plain objects.
- :jigsaw: **Composition over configuration** — Combine small pieces instead of configuring large ones.
- :shield: **Result, never throw** — Every public method returns `Result<T>`. Pattern-match on `ok` instead of try/catch.
- :lock: **Closures are state** — Workflow state is just `let` variables in your handler.
- :mag: **`$` is optional sugar** — The `$` helpers register data flow for observability; plain imperative code works too.

## Install

```bash
npm install @funkai/agents
```

## Usage

### Agent

```ts
import { agent } from "@funkai/agents";

const helper = agent({
  name: "helper",
  model: "openai/gpt-4.1",
  system: "You are a helpful assistant.",
});

const result = await helper.generate("What is TypeScript?");

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else {
  console.log(result.output);
}
```

### Tool

```ts
import { tool } from "@funkai/agents";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch the contents of a web page by URL",
  inputSchema: z.object({ url: z.url() }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { url, status: res.status, body: await res.text() };
  },
});
```

### Workflow

```ts
import { workflow } from "@funkai/agents";
import { z } from "zod";

const research = workflow(
  {
    name: "research",
    input: z.object({ topic: z.string() }),
    output: z.object({ summary: z.string(), sources: z.array(z.string()) }),
  },
  async ({ input, $ }) => {
    let sources: string[] = [];

    const data = await $.step({
      id: "fetch-sources",
      execute: async () => findSources(input.topic),
    });
    if (data.ok) sources = data.value;

    const analysis = await $.agent({
      id: "summarize",
      agent: summarizer,
      input: { text: sources.join("\n") },
    });

    return {
      summary: analysis.ok ? analysis.output : "Failed to summarize",
      sources,
    };
  },
);

const result = await research.generate({ topic: "Effect systems" });
```

### Streaming

```ts
const result = await helper.stream("Explain closures");

if (result.ok) {
  for await (const chunk of result.stream) {
    process.stdout.write(chunk);
  }
}
```

## API

| Export                         | Description                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| `agent(config)`                | Create an agent. Returns `{ generate, stream, fn }`.                  |
| `tool(config)`                 | Create a tool for function calling.                                   |
| `workflow(config, handler)`    | Create a workflow with typed I/O and tracked steps.                   |
| `createWorkflowEngine(config)` | Create a workflow factory with shared configuration and custom steps. |
| `openrouter(modelId)`          | Shorthand to create an OpenRouter language model from env key.        |
| `createOpenRouter(options?)`   | Create a reusable OpenRouter provider instance.                       |

## Documentation

For comprehensive documentation, see [docs/overview.md](docs/overview.md).

## License

[MIT](../../LICENSE)
