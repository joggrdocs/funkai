# Design Patterns

## Overview

Concrete patterns for structuring code in a functional TypeScript codebase. Use factories to encapsulate state, pipelines to transform data, and composition to combine behaviors. For the underlying constraints (no classes, no `let`, no `any`, etc.) see [Coding Style](./coding-style.md).

## Rules

### Use Factories Over Classes

Use factory functions to encapsulate state instead of classes. Factories avoid `this` confusion, do not require the `new` keyword, keep private state truly private through closures, and can return different implementations from the same interface.

#### Correct

```ts
interface Agent {
  run: (input: string) => Promise<AgentResult>;
  stop: () => void;
  isRunning: () => boolean;
}

function createAgent(config: AgentConfig): Agent {
  let running = false;

  return {
    run: async (input) => {
      running = true;
      const result = await execute(input, config);
      running = false;
      return result;
    },
    stop: () => {
      running = false;
    },
    isRunning: () => running,
  };
}

// Usage
const agent = createAgent({ model: "gpt-4o" });
await agent.run("Summarize this document");
```

```ts
// Factory can return different implementations
function createProvider(type: "openrouter" | "local") {
  if (type === "openrouter") {
    return {
      generate: (prompt: string) => callOpenRouter(prompt),
    };
  }

  return {
    generate: (prompt: string) => callLocal(prompt),
  };
}
```

#### Incorrect

```ts
class Agent {
  private running = false;

  constructor(private config: AgentConfig) {}

  async run(input: string) {
    this.running = true;
    const result = await execute(input, this.config);
    this.running = false;
    return result;
  }
}

const agent = new Agent({ model: "gpt-4o" });
const fn = agent.run;
fn("input"); // `this` is lost!
```

### Transform Data Through Pipelines

Transform data through pure pipelines. Avoid shared mutable state by returning new values at each step.

#### Correct

```ts
// Data flows through transformations
const result = steps
  .filter((step) => step.enabled)
  .map((step) => step.name)
  .join(", ");

// Explicit transformations
function processPrompt(raw: RawPrompt): ProcessedPrompt {
  const parsed = parseTemplate(raw.content);
  const validated = validateSchema(parsed);
  const resolved = resolvePartials(validated);
  return resolved;
}
```

#### Incorrect

```ts
// Mutating shared state
const steps: Step[] = [];

function addStep(step: Step) {
  steps.push(step); // Mutation!
}

// Return new state instead
function addStep(steps: readonly Step[], step: Step): Step[] {
  return [...steps, step];
}
```

### Prefer Composition Over Inheritance

Combine small, focused interfaces and factory functions instead of building inheritance hierarchies. Composition lets you mix behaviors without coupling.

#### Correct

```ts
interface Runnable {
  run: () => Promise<void>;
}

interface Configurable {
  configure: (config: Record<string, unknown>) => void;
}

function createWorkflow(name: string): Runnable & Configurable {
  let workflowConfig: Record<string, unknown> = {};

  return {
    run: async () => {
      await execute(name, workflowConfig);
    },
    configure: (config) => {
      workflowConfig = { ...config };
    },
  };
}
```

#### Incorrect

```ts
// Deep inheritance hierarchy
class Workflow {
  run() {}
}

class ConfigurableWorkflow extends Workflow {
  configure() {}
}

class ScheduledConfigurableWorkflow extends ConfigurableWorkflow {
  schedule() {}
}
```

## References

- [Coding Style](./coding-style.md) -- Constraints (no classes, no let, no any, etc.)
- [State](./state.md) -- State management patterns
- [Functions](./functions.md) -- Pure function guidelines
