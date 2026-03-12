# Function Standards

## Overview

Patterns for writing functions in TypeScript. This standard covers parameter design, documentation, purity, and composition. Well-structured functions are the primary unit of abstraction in this codebase and should be small, focused, and composable.

## Rules

### Use Object Parameters

Use an object parameter when a function has 2 or more related parameters, especially when those parameters are primitives where the meaning is unclear at the call site.

| Scenario                            | Use Object? | Why                         |
| ----------------------------------- | ----------- | --------------------------- |
| 2+ related params                   | Yes         | Named params are clearer    |
| Primitive params (`string, string`) | Yes         | Prevents argument confusion |
| Single param                        | No          | Unnecessary overhead        |
| Single complex object               | No          | Already clear               |

Define an interface with a `Params`, `Options`, or `Args` suffix, then destructure in the function signature.

| Suffix     | Use Case                         |
| ---------- | -------------------------------- |
| `*Params`  | Required input parameters        |
| `*Options` | Optional configuration           |
| `*Args`    | Function arguments (less common) |

#### Correct

```ts
interface RunWorkflowParams {
  name: string;
  input: Record<string, unknown>;
  maxSteps: number;
}

export function runWorkflow({ name, input, maxSteps }: RunWorkflowParams): WorkflowResult {
  // ...
}

// Usage is self-documenting
runWorkflow({ name: "summarize", input: { text }, maxSteps: 10 });
```

```ts
interface ResolveModelParams {
  provider: string;
  modelId: string;
}

interface ResolveModelOptions {
  fallback?: boolean;
  cache?: boolean;
}

function resolveModel(
  { provider, modelId }: ResolveModelParams,
  options?: ResolveModelOptions,
): Model {
  // ...
}
```

#### Incorrect

```ts
// What's the difference between these strings?
function runWorkflow(
  name: string,
  input: Record<string, unknown>,
  maxSteps: number,
): WorkflowResult {
  // ...
}

// Easy to swap by mistake
runWorkflow("summarize", {}, 10);
```

### Document All Functions with JSDoc

Every function requires a JSDoc comment -- both exported and non-exported. Document the "why" more than the "what". For object parameters, document the object as a whole rather than listing every property.

**Exported functions** get a full JSDoc block with `@param` and `@returns` tags.

**Non-exported (private) functions** get a JSDoc block with the `@private` tag. Keep the description concise -- one line is enough for simple helpers.

Test files are exempt from this rule.

#### Correct

```ts
/**
 * Resolves a tool definition from the agent configuration.
 *
 * @param params - Tool name and agent config to search.
 * @returns The resolved tool or an error.
 */
export function resolveTool({ name, config }: ResolveToolParams): Result<Tool, ToolError> {
  // ...
}

/**
 * Normalize a tool name to lowercase kebab-case.
 *
 * @private
 * @param name - Raw tool name from the config.
 * @returns The normalized name.
 */
function normalizeName(name: string): string {
  return kebabCase(name);
}
```

#### Incorrect

```ts
// Missing JSDoc entirely
export function resolveTool(params: ResolveToolParams) {}

// Missing @private on non-exported function
function normalizeName(name: string): string {
  return kebabCase(name);
}

// Listing every property in JSDoc
/**
 * @param params.name - The tool name
 * @param params.config - The agent config
 */
export function resolveTool(params: ResolveToolParams) {}
```

### Prefer Pure Functions

Prefer pure functions that have no side effects and return predictable outputs. Same inputs must always produce same outputs, with no modification of external state and no I/O operations.

#### Correct

```ts
// Pure function - no side effects
function buildPrompt(template: string, variables: readonly Variable[]): string {
  return variables.reduce((prompt, v) => prompt.replace(`{{${v.name}}}`, v.value), template);
}
```

```ts
// Pure business logic separated from side effects
function validateConfig(config: AgentConfig): ValidationResult {
  // ...
}

// Side effects isolated in handler
async function handleAgentRun(config: AgentConfig) {
  const validation = validateConfig(config); // Pure

  if (!validation.ok) {
    logger.warn({ validation }, "Invalid config"); // Side effect at edge
    return;
  }

  await executeAgent(config); // Side effect at edge
}
```

#### Incorrect

```ts
// Side effects mixed into business logic
function buildPrompt(template: string, variables: readonly Variable[]): string {
  console.log("Building prompt..."); // Side effect
  const result = variables.reduce((p, v) => p.replace(`{{${v.name}}}`, v.value), template);
  analytics.track("prompt_built"); // Side effect
  return result;
}
```

### Compose Small Functions

Prefer small, focused functions that can be composed together. Use early returns to flatten control flow instead of nesting.

#### Correct

```ts
// Small, focused functions
const normalize = (s: string) => s.trim().toLowerCase();
const validate = (s: string) => s.length > 0;
const format = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Composed together
function processName(input: string): string | null {
  const normalized = normalize(input);
  if (!validate(normalized)) return null;
  return format(normalized);
}
```

```ts
// Early returns to avoid deep nesting
function process(step: Step) {
  if (step.type !== "tool_call") return;
  if (step.status !== "active") return;
  if (step.args.length === 0) return;

  // Main logic here
}
```

#### Incorrect

```ts
// Deeply nested conditionals
function process(step: Step) {
  if (step.type === "tool_call") {
    if (step.status === "active") {
      if (step.args.length > 0) {
        // ...
      }
    }
  }
}
```

## References

- [Naming Conventions](./naming.md) -- Parameter interface naming
- [Design Patterns](./design-patterns.md) -- Factories, pipelines, composition
