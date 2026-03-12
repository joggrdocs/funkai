# tool()

`tool()` creates a tool for AI agent function calling. It wraps the AI SDK's `tool()` helper, converting Zod schemas to JSON Schema via `zodSchema()` for model I/O validation.

## Signature

```ts
function tool<TInput, TOutput>(config: ToolConfig<TInput, TOutput>): Tool<TInput, TOutput>;
```

## ToolConfig

| Field           | Required | Type                                  | Description                                |
| --------------- | -------- | ------------------------------------- | ------------------------------------------ |
| `description`   | Yes      | `string`                              | What the tool does (shown to the model)    |
| `title`         | No       | `string`                              | Display title for UIs and logs             |
| `inputSchema`   | Yes      | `ZodType<TInput>`                     | Zod schema for validating and typing input |
| `outputSchema`  | No       | `ZodType<TOutput>`                    | Zod schema for validating output           |
| `inputExamples` | No       | `Array<{ input: TInput }>`            | Example inputs to guide the model          |
| `execute`       | Yes      | `(input: TInput) => Promise<TOutput>` | Execute the tool with validated input      |

**Note:** There is no `name` field on `ToolConfig`. Tool names come from the object key when passed to an agent's `tools` record.

## Tool Type

The `Tool` type is the return type of the AI SDK's `tool()` function:

```ts
type Tool<TInput = unknown, TOutput = unknown> = ReturnType<typeof aiTool<TInput, TOutput>>;
```

## Example

```ts
import { tool, agent } from "@joggr/agent-sdk";
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

// Tool name ("fetchPage") comes from the object key:
const assistant = agent({
  name: "assistant",
  model: "openai/gpt-4.1",
  system: "You are a helpful assistant that can fetch web pages.",
  tools: { fetchPage },
});
```

### Output validation

```ts
const calculator = tool({
  description: "Evaluate a math expression",
  inputSchema: z.object({ expression: z.string() }),
  outputSchema: z.object({ result: z.number() }),
  execute: async ({ expression }) => {
    return { result: evaluate(expression) };
  },
});
```

### Input examples

```ts
const searchTool = tool({
  description: "Search the codebase for a pattern",
  inputSchema: z.object({
    query: z.string(),
    fileType: z.string().optional(),
  }),
  inputExamples: [
    { input: { query: "function handleError", fileType: "ts" } },
    { input: { query: "TODO:" } },
  ],
  execute: async ({ query, fileType }) => {
    return await searchCodebase(query, fileType);
  },
});
```

## References

- [Agent](agent.md)
- [Core Overview](overview.md)
- [Guide: Create a Tool](../guides/create-tool.md)
