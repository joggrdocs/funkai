# State Management

## Overview

Patterns for managing state immutably in TypeScript. All state transitions should produce new values rather than mutating existing ones, keeping side effects predictable and functions pure. These rules apply to any stateful module in the monorepo.

## Rules

### Create New State Instead of Mutating

State should never be mutated in place. Return new arrays and objects from every transformation.

#### Correct

```ts
function addStep(steps: readonly Step[], newStep: Step): readonly Step[] {
  return [...steps, newStep];
}

function updateStep(steps: readonly Step[], id: string, updates: Partial<Step>): readonly Step[] {
  return steps.map((step) => (step.id === id ? { ...step, ...updates } : step));
}

function removeStep(steps: readonly Step[], id: string): readonly Step[] {
  return steps.filter((step) => step.id !== id);
}
```

#### Incorrect

```ts
function addStep(steps: Step[], newStep: Step) {
  steps.push(newStep); // Mutation!
}

function updateStep(steps: Step[], id: string, updates: Partial<Step>) {
  const step = steps.find((s) => s.id === id);
  Object.assign(step, updates); // Mutation!
}
```

### Encapsulate State with Factories

Use factories and closures to encapsulate state. Never use classes. Mutation inside a closure is the accepted pattern for stateful modules -- the public API should remain immutable.

#### Correct

```ts
function createCache<T>() {
  const cache = new Map<string, T>();

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: T) => {
      cache.set(key, value);
    },
    has: (key: string) => cache.has(key),
    clear: () => cache.clear(),
  };
}

const toolCache = createCache<ResolvedTool>();
toolCache.set("search", resolvedTool);
```

#### Incorrect

```ts
class Cache<T> {
  private cache = new Map<string, T>();

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: T) {
    this.cache.set(key, value);
  }
}
```

### Derive State, Don't Store Duplicates

Compute derived values from source state on demand. Never store values that can be calculated from existing state.

#### Correct

```ts
interface WorkflowState {
  steps: readonly Step[];
}

function getStepCount(state: WorkflowState): number {
  return state.steps.length;
}

function getStepNames(state: WorkflowState): readonly string[] {
  return state.steps.map((s) => s.name);
}

// Usage - compute when needed
const count = getStepCount(workflow);
const names = getStepNames(workflow);
```

#### Incorrect

```ts
interface WorkflowState {
  steps: Step[];
  stepCount: number; // Derived - will get out of sync!
  stepNames: string[]; // Derived - will get out of sync!
}
```

## References

- [Design Patterns](./design-patterns.md) -- Factories and functional design
- [Functions](./functions.md) -- Pure functions
