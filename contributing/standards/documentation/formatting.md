# Documentation Formatting Standards

## Overview

Standards for code examples, tables, code blocks, and markdown formatting. Consistent formatting makes documentation scannable and reduces cognitive load. These rules apply to all markdown files in the repository.

## Rules

### Keep Code Examples Minimal

Show only the critical parts. Omit imports, boilerplate, and obvious code.

#### Correct

This example is focused on the API.

```ts
const agent = createAgent({ model: "openai/gpt-4o", tools: [searchTool] });
const result = await agent.run("Summarize the latest news");
```

#### Incorrect

This example is too noisy and the reader is distracted by the boilerplate and obvious code.

```ts
import { createAgent } from "@funkai/agents";
import { searchTool } from "./tools/search";
import { createProvider } from "./lib/provider";
import { logger } from "./lib/logger";

async function main() {
  const provider = createProvider("openrouter");
  const agent = createAgent({ model: "openai/gpt-4o", tools: [searchTool] });
  const result = await agent.run("Summarize the latest news");

  logger.info(`Result: ${result.output}`);
}

main();
```

### Use Full Examples for Copy-Paste Templates

When the reader should copy the entire block, show everything including imports and full structure.

#### Correct

```ts
// Full file template - reader copies this
import { agent, tool } from "@funkai/agents";
import { z } from "zod";

const searchTool = tool({
  name: "search",
  description: "Search the web",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // implementation
  },
});

export default agent({
  name: "researcher",
  model: "openai/gpt-4o",
  tools: [searchTool],
});
```

### Follow Code Example Rules

- No inline comments unless explaining non-obvious logic
- No `// ...` or placeholder code
- Use real values, not `foo`/`bar`/`example`
- Show imports only when they are the point of the example

### Use Tables for Structured Information

Use tables when presenting structured data with consistent columns.

#### Correct

| Item   | Description |
| ------ | ----------- |
| First  | Description |
| Second | Description |

### Specify Language in Code Blocks

Always specify the language for syntax highlighting.

#### Correct

```ts
const example = "typescript";
```

```bash
pnpm build
```

#### Incorrect

```
const example = 'no highlighting'
```

### Use Correct Link Styles

- Use relative links for internal docs: `[Agent SDK](../agents/overview.md)`
- Use full URLs for external docs: `[Zod](https://zod.dev)`

## References

- [Writing Standards](./writing.md)
- [Diagram Standards](./diagrams.md)
