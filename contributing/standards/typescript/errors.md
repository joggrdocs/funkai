# Error Handling

## Overview

Prefer returning errors as values over throwing exceptions. The `Result<T, E>` tuple pattern and the `attempt()` utility from es-toolkit make error handling explicit, type-safe, and composable. Use `ts-pattern` for exhaustive error matching. Reserve `throw` for truly exceptional situations at system boundaries.

## Rules

### Use the Result Type

Define success and failure as a tuple where the first element is the error (or `null`) and the second is the value (or `null`). Destructure the tuple to check which case occurred.

```ts
type Result<T, E = Error> = readonly [E, null] | readonly [null, T];
```

Construct success and failure tuples directly:

```ts
// Success
const success: Result<AgentConfig, ParseError> = [null, config];

// Failure
const failure: Result<AgentConfig, ParseError> = [
  { type: "parse_error", message: "Invalid JSON" },
  null,
];
```

### Use attempt() for Wrapping Unsafe Operations

Use `attempt()` from es-toolkit to wrap operations that might throw into Result tuples.

#### Correct

```ts
import { attempt } from "es-toolkit";

const [error, parsed] = attempt(() => JSON.parse(raw));

if (error) {
  return [{ type: "parse_error", message: error.message }, null];
}

return [null, parsed];
```

### Return Results for Expected Failures

Use `Result<T, E>` for operations that can fail in expected ways such as parsing, validation, file I/O, and external calls. Define a specific error interface for each domain.

#### Correct

```ts
interface ParseError {
  type: "parse_error" | "validation_error";
  message: string;
}

function parseConfig(json: string): Result<AgentConfig, ParseError> {
  const [error, data] = attempt(() => JSON.parse(json));

  if (error) {
    return [{ type: "parse_error", message: "Invalid JSON" }, null];
  }

  return [null, data];
}

// Usage -- destructure the tuple
const [parseError, config] = parseConfig(input);

if (parseError) {
  logger.error({ error: parseError }, "Failed to parse config");
  return;
}

// config is typed as AgentConfig
processConfig(config);
```

#### Incorrect

```ts
// Throwing instead of returning a Result
function parseConfig(json: string): AgentConfig {
  if (!json) {
    throw new Error("Empty input");
  }
  return JSON.parse(json);
}
```

### Wrap Async Operations

Use a wrapper to convert promise rejections into `Result` tuples.

#### Correct

```ts
async function attemptAsync<T, E = unknown>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    return [null, await fn()];
  } catch (error) {
    return [error as E, null];
  }
}

// Usage -- destructure the tuple
const [readError, contents] = await attemptAsync(() => readFile(configPath));

if (readError) {
  console.error("Read failed:", readError);
  return;
}

// contents is typed as string (or whatever readFile returns)
processContents(contents);
```

### Define Domain-Specific Results

Create type aliases for consistency within a domain. This keeps function signatures short and error types discoverable.

#### Correct

```ts
// types.ts
interface AgentError {
  type: "invalid_config" | "missing_tool" | "execution_failed";
  message: string;
  details?: unknown;
}

export type AgentResult<T> = Result<T, AgentError>;

// implementation
function createAgent(config: AgentConfig): AgentResult<Agent> {
  // returns [AgentError, null] on failure or [null, Agent] on success
}
```

### Chain Results with Early Returns

Use early returns to chain multiple Result-producing steps. Each step bails out on the first error.

#### Correct

```ts
async function runWorkflow(
  name: string,
  input: unknown,
): Promise<Result<WorkflowOutput, WorkflowError>> {
  // Step 1: Load config
  const [configError, config] = loadConfig(name);
  if (configError) return [configError, null];

  // Step 2: Resolve steps
  const [resolveError, steps] = resolveSteps(config);
  if (resolveError) return [resolveError, null];

  // Step 3: Execute
  const [execError, output] = await execute(steps, input);
  if (execError) return [execError, null];

  return [null, output];
}
```

### Handle Multiple Error Types

Use destructuring and early returns to handle different error types. For exhaustive handling of multiple error variants, combine with `ts-pattern`.

#### Correct

```ts
const [error, config] = loadConfig(path);

if (error) {
  match(error.type)
    .with("invalid_config", () => {
      logger.warn("Invalid configuration file");
    })
    .with("missing_tool", () => {
      logger.warn("Required tool not found");
    })
    .with("execution_failed", () => {
      logger.warn("Execution failed");
    })
    .exhaustive();
  return;
}

applyConfig(config);
```

### Never Throw in Result-Returning Functions

A function that declares `Result` as its return type must never throw. All failure paths must return an error tuple.

#### Correct

```ts
function parse(json: string): Result<Data, ParseError> {
  if (!json) {
    return [{ type: "parse_error", message: "Empty input" }, null];
  }
  return [null, JSON.parse(json)];
}
```

#### Incorrect

```ts
function parse(json: string): Result<Data, ParseError> {
  if (!json) {
    throw new Error("Empty input"); // Don't throw!
  }
  return [null, JSON.parse(json)];
}
```

### Always Check Results Before Accessing Values

Never access the value element without first confirming the error element is `null`. Destructure the tuple and check the error before using the value.

#### Correct

```ts
const [error, config] = parseConfig(input);
if (!error) {
  processConfig(config);
}
```

#### Incorrect

```ts
const [, config] = parseConfig(input);
processConfig(config); // config might be null -- error was not checked
```

## References

- [Types](./types.md) -- Discriminated union patterns
- [Conditionals](./conditionals.md) -- ts-pattern for error handling
- [Utilities](./utilities.md) -- es-toolkit attempt()
