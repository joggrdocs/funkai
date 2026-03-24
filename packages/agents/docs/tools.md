# Tools

`tool()` creates a tool for AI agent function calling. It wraps the AI SDK's `tool()` helper, converting Zod schemas to JSON Schema via `zodSchema()` for model I/O validation.

## Define a tool

Provide a `description`, an `inputSchema`, and an `execute` function. The `execute` function receives the validated input directly — not wrapped in an object.

```ts
import { tool } from "@funkai/agents";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch a web page by URL",
  inputSchema: z.object({ url: z.url() }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { url, status: res.status, body: await res.text() };
  },
});
```

## Register a tool on an agent

Pass tools as a record on the agent config. The tool's **name comes from the object key**, not from the tool definition. The model sees the key name and uses the `description` to decide when to call it.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const researcher = agent({
  name: "researcher",
  model: openai("gpt-4.1"),
  system: "You research topics by fetching web pages.",
  tools: { fetchPage },
});
```

## Add output validation

Use `outputSchema` to validate the tool's return value before it is sent back to the model.

```ts
const calculator = tool({
  description: "Evaluate a math expression",
  inputSchema: z.object({ expression: z.string() }),
  outputSchema: z.object({ result: z.number() }),
  execute: async ({ expression }) => {
    const result = eval(expression); // simplified example
    return { result };
  },
});
```

## Add input examples

Use `inputExamples` to help the model understand expected input structure. Natively supported by Anthropic; for other providers, examples can be injected into the description via middleware.

```ts
const searchTool = tool({
  description: "Search the codebase",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    maxResults: z.number().default(10),
  }),
  inputExamples: [
    { input: { query: "authentication middleware", maxResults: 5 } },
    { input: { query: "database connection pool", maxResults: 10 } },
  ],
  execute: async ({ query, maxResults }) => {
    return await codeSearch(query, maxResults);
  },
});
```

## Destructure input

Since `execute` receives the validated input directly, destructure in the function signature for cleaner code.

```ts
const createFile = tool({
  description: "Create a file with the given content",
  inputSchema: z.object({
    path: z.string(),
    content: z.string(),
  }),
  execute: async ({ path, content }) => {
    await fs.writeFile(path, content);
    return { created: path };
  },
});
```

## Full example

```ts
import { tool, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch the contents of a web page by URL",
  inputSchema: z.object({
    url: z.url(),
  }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return {
      url,
      status: res.status,
      body: await res.text(),
    };
  },
});

// Tool name ("fetchPage") comes from the object key
const assistant = agent({
  name: "assistant",
  model: openai("gpt-4.1"),
  system: "You are a helpful assistant that can fetch web pages.",
  tools: { fetchPage },
});
```

---

## Reference: `tool()` signature

```ts
function tool<TInput, TOutput>(config: ToolConfig<TInput, TOutput>): Tool<TInput, TOutput>;
```

## Reference: ToolConfig

| Field           | Required | Type                                  | Description                                |
| --------------- | -------- | ------------------------------------- | ------------------------------------------ |
| `description`   | Yes      | `string`                              | What the tool does (shown to the model)    |
| `inputSchema`   | Yes      | `ZodType<TInput>`                     | Zod schema for validating and typing input |
| `execute`       | Yes      | `(input: TInput) => Promise<TOutput>` | Execute the tool with validated input      |
| `outputSchema`  | No       | `ZodType<TOutput>`                    | Zod schema for validating output           |
| `title`         | No       | `string`                              | Display title for UIs and logs             |
| `inputExamples` | No       | `Array<{ input: TInput }>`            | Example inputs to guide the model          |

There is no `name` field on `ToolConfig`. Tool names come from the object key when passed to an agent's `tools` record.

## Reference: Tool type

```ts
type Tool<TInput = unknown, TOutput = unknown> = ReturnType<typeof aiTool<TInput, TOutput>>;
```

---

## Troubleshooting

### Tool not being called

Improve the `description` so the model understands when to use it. Add `.describe()` calls to individual schema fields to guide generation.

### Input validation errors

Ensure the `inputSchema` matches what the model is likely to produce.

### Tool name mismatch

Tool names come from the object key in `tools: { myName: myTool }`, not from the tool definition itself.

---

## See also

- [Create an Agent](create-agent.md)
- [Create a Flow Agent](create-flow-agent.md)
- [Troubleshooting](troubleshooting.md)
