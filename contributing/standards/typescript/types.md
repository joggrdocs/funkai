# Type Patterns

## Overview

Patterns for defining and using TypeScript types effectively. Prefer discriminated unions for variant modeling, branded types for domain safety, and utility types to avoid repetition. These rules apply to all type definitions in the monorepo.

## Rules

### Use Discriminated Unions for Variants

Define a common discriminator field (usually `type`, `kind`, or `strategy`) that TypeScript uses to narrow the type. Combine with `ts-pattern` for exhaustive matching.

#### Correct

```ts
type StepResult =
  | { type: "success"; output: string }
  | { type: "failure"; error: string; exitCode: number }
  | { type: "skipped"; reason: string };

// Narrowing with if-checks
function summarize(result: StepResult): string {
  if (result.type === "success") {
    return result.output;
  }
  if (result.type === "failure") {
    return `Exit ${result.exitCode}: ${result.error}`;
  }
  return `Skipped: ${result.reason}`;
}

// Exhaustive matching with ts-pattern
import { match } from "ts-pattern";

const summary = match(result)
  .with({ type: "success" }, (r) => r.output)
  .with({ type: "failure" }, (r) => `Exit ${r.exitCode}: ${r.error}`)
  .with({ type: "skipped" }, (r) => `Skipped: ${r.reason}`)
  .exhaustive();
```

### Use type-fest for Common Utilities

Use [type-fest](https://github.com/sindresorhus/type-fest) for type utilities not included in TypeScript's standard library.

| Utility             | Description                    | Example                       |
| ------------------- | ------------------------------ | ----------------------------- |
| `SetRequired<T, K>` | Make specific keys required    | `SetRequired<Agent, 'model'>` |
| `SetOptional<T, K>` | Make specific keys optional    | `SetOptional<Agent, 'hooks'>` |
| `PartialDeep<T>`    | Deep partial (nested optional) | `PartialDeep<AgentConfig>`    |
| `ReadonlyDeep<T>`   | Deep readonly                  | `ReadonlyDeep<WorkflowState>` |
| `Except<T, K>`      | Omit with better inference     | `Except<Agent, 'internal'>`   |
| `Simplify<T>`       | Flatten intersection types     | `Simplify<A & B>`             |

#### Correct

```ts
import type { SetRequired, PartialDeep } from "type-fest";

interface AgentConfig {
  name: string;
  model?: string;
  tools?: Record<string, Tool>;
}

// Make model required after resolution
type ResolvedAgentConfig = SetRequired<AgentConfig, "model">;

// Deep partial for patch operations
type AgentConfigPatch = PartialDeep<AgentConfig>;
```

### Write Type Guards for Runtime Checks

Create custom type guard functions that return `value is T` for runtime type narrowing.

#### Correct

```ts
function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

function isToolCall(step: Step): step is ToolCallStep {
  return step.type === "tool_call";
}

// Usage
const toolCalls = steps.filter(isToolCall);
```

#### Incorrect

```ts
// Using `as` assertion instead of a guard
function getToolCall(step: unknown) {
  const toolCall = step as ToolCallStep; // Unsafe - no runtime check
  return toolCall;
}
```

### Use Built-in Utility Types

TypeScript ships utility types for common transformations. Use them instead of hand-rolling equivalents.

| Utility         | Use Case                          | Example                |
| --------------- | --------------------------------- | ---------------------- |
| `Partial<T>`    | All properties optional           | Update payloads        |
| `Required<T>`   | All properties required           | Validated configs      |
| `Pick<T, K>`    | Select specific properties        | API response subsets   |
| `Omit<T, K>`    | Exclude specific properties       | Remove internal fields |
| `Record<K, V>`  | Object with typed keys            | Lookup tables          |
| `Extract<T, U>` | Extract matching types from union | Filter union variants  |
| `Exclude<T, U>` | Remove matching types from union  | Remove union variants  |

#### Correct

```ts
interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: ToolExecuteFn;
}

// For update operations - all fields optional
type ToolUpdate = Partial<Tool>;

// For display - only relevant fields
type ToolSummary = Pick<Tool, "name" | "description">;

// Lookup table
type ToolMap = Record<string, Tool>;
```

### Use Branded Types for Domain Safety

Use branded types to prevent mixing up structurally identical primitives.

#### Correct

```ts
type Brand<T, B> = T & { __brand: B };

type AgentId = Brand<string, "AgentId">;
type WorkflowId = Brand<string, "WorkflowId">;

function agentId(id: string): AgentId {
  return id as AgentId;
}

function workflowId(id: string): WorkflowId {
  return id as WorkflowId;
}

// Type error - cannot mix them up
function runAgent(agent: AgentId, workflow: WorkflowId) {}
runAgent(workflowId("wf-1"), agentId("ag-1")); // Type error!
```

#### Incorrect

```ts
// Easy to mix up positional strings
function runAgent(agent: string, workflow: string) {}
runAgent("wf-1", "ag-1"); // Compiles but wrong order!
```

### Use Const Assertions for Literal Types

Use `as const` for literal types, readonly arrays, and deriving union types from values.

#### Correct

```ts
const STEP_TYPES = ["tool_call", "generation", "validation"] as const;
type StepType = (typeof STEP_TYPES)[number];
// Type: "tool_call" | "generation" | "validation"

const DEFAULTS = {
  maxSteps: 10,
  parallel: false,
} as const;
// Type: { readonly maxSteps: 10; readonly parallel: false }
```

#### Incorrect

```ts
// Without as const, you get wide types
const STEP_TYPES = ["tool_call", "generation", "validation"];
// Type: string[] -- no literal union possible

const DEFAULTS = {
  maxSteps: 10,
  parallel: false,
};
// Type: { maxSteps: number; parallel: boolean } -- literals lost
```

## Resources

- [type-fest Documentation](https://github.com/sindresorhus/type-fest)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

## References

- [Conditionals](./conditionals.md) -- Using discriminated unions with ts-pattern
