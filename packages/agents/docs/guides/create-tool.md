# Create a Tool

## Prerequisites

- `@funkai/agents` installed
- Familiarity with Zod schemas

## Steps

### 1. Define a tool with `tool()`

A tool wraps a function for AI agent function calling. Provide a `description`, an `inputSchema`, and an `execute` function.

```ts
import { tool } from "@funkai/agents";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch a web page by URL",
  inputSchema: z.object({ url: z.url() }),
  execute: async (input) => {
    const res = await fetch(input.url);
    return { url: input.url, status: res.status, body: await res.text() };
  },
});
```

The `execute` function receives the validated input directly -- not wrapped in an object.

### 2. Register the tool on an agent

Pass tools as a record on the agent config. The tool's name comes from the object key, not from the tool definition itself.

```ts
import { agent } from "@funkai/agents";

const researcher = agent({
  name: "researcher",
  model: "openai/gpt-4.1",
  system: "You research topics by fetching web pages.",
  tools: { fetchPage },
});
```

The model sees the tool as `fetchPage` and uses the `description` to decide when to call it.

### 3. Add optional configuration

| Field           | Type                    | Description                                                       |
| --------------- | ----------------------- | ----------------------------------------------------------------- |
| `description`   | `string`                | **Required.** What the tool does. Shown to the model.             |
| `inputSchema`   | `ZodType`               | **Required.** Validates and types the input from the model.       |
| `execute`       | `(input) => Promise<T>` | **Required.** Runs when the model calls the tool.                 |
| `outputSchema`  | `ZodType`               | Optional. Validates the return value before sending to the model. |
| `title`         | `string`                | Optional. Human-readable display title for UIs and logs.          |
| `inputExamples` | `Array<{ input: T }>`   | Optional. Example inputs to guide the model.                      |

### 4. Add output validation

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

### 5. Add input examples

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

### 6. Destructure input for cleaner code

Since `execute` receives the validated input directly, you can destructure it in the function signature.

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

## Verification

- The agent calls the tool during `.generate()` when the model decides to use it
- Check that `result.messages` contains tool call and tool result entries
- Tool return values appear in the model's context for subsequent reasoning

## Troubleshooting

### Tool not being called

**Fix:** Improve the `description` so the model understands when to use it.

### Input validation errors

**Fix:** Ensure the `inputSchema` matches what the model is likely to produce.

### Tool name mismatch

**Fix:** Tool names come from the object key in `tools: { myName: myTool }`, not from the tool definition.

## References

- [Create an Agent](create-agent.md)
- [Create a Workflow](create-workflow.md)
- [Troubleshooting](../troubleshooting.md)
