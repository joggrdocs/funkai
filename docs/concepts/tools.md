# Tools

`tool()` creates a typed function-calling tool. The model sees the description and input schema; when it calls the tool, the input is validated against the Zod schema before `execute` receives it.

Tool names come from the object key in the agent's `tools` record — there is no `name` field on the config.

## Creating a tool

```typescript
import { tool } from "@funkai/agents";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch the HTML contents of a web page by URL.",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  },
});
```

## Using a tool with an agent

```typescript
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const researcher = agent({
  name: "researcher",
  model: openai("gpt-4.1"),
  system: "You research topics by fetching web pages.",
  tools: { fetchPage }, // key "fetchPage" becomes the tool name
});

const result = await researcher.generate({ prompt: "Summarize https://example.com" });

if (result.ok) {
  console.log(result.output);
}
```

## Output validation

Add `outputSchema` to validate what `execute` returns:

```typescript
const calculator = tool({
  description: "Evaluate a math expression and return the numeric result.",
  inputSchema: z.object({ expression: z.string() }),
  outputSchema: z.object({ result: z.number() }),
  execute: async ({ expression }) => ({ result: evaluate(expression) }),
});
```

## Input examples

Provide `inputExamples` to guide the model toward correct usage:

```typescript
const search = tool({
  description: "Search the codebase for a pattern.",
  inputSchema: z.object({
    query: z.string(),
    fileType: z.string().optional(),
  }),
  inputExamples: [
    { input: { query: "export const agent", fileType: "ts" } },
    { input: { query: "TODO" } },
  ],
  execute: async ({ query, fileType }) => searchCodebase(query, fileType),
});
```

## Config fields

| Field           | Required | Description                                       |
| --------------- | -------- | ------------------------------------------------- |
| `description`   | Yes      | What the tool does (shown to the model)           |
| `inputSchema`   | Yes      | Zod schema — validated before `execute` is called |
| `execute`       | Yes      | Async function receiving validated input          |
| `title`         | No       | Display title for UIs and logs                    |
| `outputSchema`  | No       | Zod schema for validating `execute`'s return      |
| `inputExamples` | No       | Example inputs to guide the model                 |

## References

- [`tool()` reference](/reference/agents/tool)
- [Agents](/concepts/agents)
