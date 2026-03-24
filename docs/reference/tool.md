# tool()

Create a typed function-calling tool for use with agents. The model sees the `description` and `inputSchema`; when the model invokes the tool, input is validated against the Zod schema before `execute` runs.

## Function Signature

```typescript
function tool<TInput, TOutput>(config: ToolConfig<TInput, TOutput>): Tool<TInput, TOutput>;
```

## ToolConfig

```typescript
interface ToolConfig<TInput, TOutput> {
  description: string;
  title?: string;
  inputSchema: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
  inputExamples?: { input: TInput }[];
  execute: (input: TInput) => Promise<TOutput>;
}
```

| Field           | Type                                  | Required | Description                                                                                                                  |
| --------------- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `description`   | `string`                              | Yes      | Human-readable description shown to the model. Guides when and how to call the tool                                          |
| `title`         | `string`                              | No       | Optional display title shown in UIs and logs                                                                                 |
| `inputSchema`   | `ZodType<TInput>`                     | Yes      | Zod schema serialized to JSON Schema for the model; input is validated before `execute`                                      |
| `outputSchema`  | `ZodType<TOutput>`                    | No       | Validates the return value of `execute` before it is sent back to the model                                                  |
| `inputExamples` | `{ input: TInput }[]`                 | No       | Example inputs to guide the model. Natively supported by Anthropic; use `addToolInputExamplesMiddleware` for other providers |
| `execute`       | `(input: TInput) => Promise<TOutput>` | Yes      | Called with validated input after the model requests a tool call                                                             |

## Tool Type

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool<TInput = any, TOutput = any> = ReturnType<typeof aiTool<TInput, TOutput>>;
```

`Tool` is the return type of the AI SDK's `tool()` helper. Defaults use `any` so `Record<string, Tool>` accepts concrete typed tools without contravariance issues.

## Tool Names

Tool keys in the `tools` record on `AgentConfig` must be provider-safe identifiers matching `^[a-zA-Z_][a-zA-Z0-9_]*$`. Only camelCase and snake_case are accepted. Kebab-case, dot.case, and names with colons or spaces are rejected at both type level (`ToolName<S>`) and runtime.

```typescript
type ToolName<S extends string> = /* camelCase or snake_case only */
```

```typescript
// Valid
{ fetchPage, search_web, getWeather }

// Invalid — runtime error
{ 'fetch-page': ..., 'search.web': ... }
```

## Using Tools with Agents

Pass a record of `Tool` instances to `AgentConfig.tools`. Keys become the tool names exposed to the model.

```typescript
import { agent, tool } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const fetchPage = tool({
  description: "Fetch the contents of a web page by URL",
  inputSchema: z.object({ url: z.string().url() }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  },
});

const myAgent = agent({
  name: "researcher",
  model: openai("gpt-4.1"),
  system: "You research topics on the web.",
  tools: { fetchPage },
});
```

## Using Agents as Subagents

Pass a record of `Agent` instances to `AgentConfig.agents`. Each subagent is automatically wrapped as a callable tool. Keys must satisfy the same naming constraints as tool names.

```typescript
const orchestrator = agent({
  name: "orchestrator",
  model: openai("gpt-4.1"),
  system: "Coordinate research and summarization.",
  agents: { researcher, summarizer },
});
```

Abort signals propagate from parent to child automatically. The parent agent's tool loop can invoke subagents by name just like regular tools.

## Dynamic Tools via Resolver

Both `tools` and `agents` accept resolver functions that receive the validated input:

```typescript
const myAgent = agent({
  name: "dynamic",
  model: openai("gpt-4.1"),
  input: z.object({ plan: z.enum(["basic", "pro"]) }),
  prompt: ({ input }) => `Process with ${input.plan} plan`,
  tools: ({ input }) => (input.plan === "pro" ? { fetchPage, search } : { search }),
});
```

## See Also

- [Tools concept](/concepts/tools) — overview with progressive examples
- [`agent()` reference](/reference/agents/agent) — agent configuration and tool integration
