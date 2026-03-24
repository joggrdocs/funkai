# createPrompt()

Create a prompt module from a config object. Encapsulates LiquidJS template rendering and Zod variable validation into a single callable unit. This is the low-level API — most users create prompts via `.prompt` files and codegen instead.

## Function Signature

```typescript
function createPrompt<T>(config: PromptConfig<T>): PromptModule<T>;
```

## Usage

```typescript
import { createPrompt } from "@funkai/prompts";
import { z } from "zod";

const greeting = createPrompt({
  name: "greeting",
  template: "Hello, {{ name }}! You are a {{ role }}.",
  schema: z.object({
    name: z.string(),
    role: z.string(),
  }),
});

// Render with validated variables
const text = greeting.render({ name: "Alice", role: "developer" });
// => "Hello, Alice! You are a developer."

// Validate without rendering
const parsed = greeting.validate({ name: "Bob", role: "designer" });
```

## PromptConfig

```typescript
interface PromptConfig<T = unknown> {
  readonly name: string;
  readonly template: string;
  readonly schema: ZodType<T>;
  readonly group?: string;
}
```

| Field      | Type         | Required | Description                                                  |
| ---------- | ------------ | -------- | ------------------------------------------------------------ |
| `name`     | `string`     | Yes      | Kebab-case identifier (e.g. `'greeting'`, `'worker-system'`) |
| `template` | `string`     | Yes      | LiquidJS template string with `{{ variable }}` expressions   |
| `schema`   | `ZodType<T>` | Yes      | Zod schema for validating template variables                 |
| `group`    | `string`     | No       | Namespace path (e.g. `'agents'`, `'agents/core'`)            |

## PromptModule

```typescript
interface PromptModule<T = unknown> {
  readonly name: string;
  readonly group: string | undefined;
  readonly schema: ZodType<T>;
  render(variables: T): string;
  validate(variables: unknown): T;
}
```

| Member                | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `name`                | Prompt identifier                                                                |
| `group`               | Group/namespace path or `undefined`                                              |
| `schema`              | Zod schema for variable validation                                               |
| `render(variables)`   | Validate variables and render the LiquidJS template; returns the rendered string |
| `validate(variables)` | Validate and parse variables through the Zod schema; throws on failure           |

## See Also

- [Prompts concept](/concepts/prompts) — overview of the `.prompt` file format and codegen workflow
- [`createPromptGroup()` reference](/reference/prompts/create-prompt-group) — group related prompts
- [`createPromptRegistry()` reference](/reference/prompts/create-prompt-registry) — assemble a typed registry
- [Prompts CLI reference](/reference/prompts/cli) — codegen, lint, create, setup commands
