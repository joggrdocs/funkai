# Naming Conventions

## Overview

Conventions for naming files, variables, and object properties. Consistent naming makes the codebase scannable, searchable, and predictable. These rules apply to all TypeScript source files in the monorepo.

## Rules

### File Naming

Use **kebab-case** for all file names. Design file names with `ls` in mind -- they should be scannable and sortable.

| Type      | Pattern         | Example                |
| --------- | --------------- | ---------------------- |
| Module    | `kebab-case.ts` | `agent-builder.ts`     |
| Types     | `types.ts`      | `types.ts`             |
| Constants | `constants.ts`  | `constants.ts`         |
| Schema    | `schema.ts`     | `schema.ts`            |
| Utilities | `utils.ts`      | `utils.ts`             |
| Config    | `config.ts`     | `config.ts`            |
| Tests     | `*.test.ts`     | `agent-builder.test.ts`|

#### Correct

```
agent-builder.ts
agent-types.ts
workflow-runner.ts
workflow-types.ts
```

#### Incorrect

```
AgentBuilder.ts
agent_types.ts
workflowRunner.ts
```

### Variable Naming

Use **camelCase** for variables and function names.

#### Correct

```ts
const agentId = '123'
const isCompleted = true
function parseToolResult() {}
```

#### Incorrect

```ts
const agent_id = '123'
const IsCompleted = true
function ParseToolResult() {}
```

### Constant Naming

Use **SCREAMING_SNAKE_CASE** for constants. Group related constants in objects with `as const`.

#### Correct

```ts
export const MAX_RETRIES = 3

export const WORKFLOW_EVENTS = {
  START: 'start',
  COMPLETE: 'complete',
} as const
```

#### Incorrect

```ts
export const maxRetries = 3
export const workflowEvents = { start: 'start' }
```

### Object Property Naming

Prefer **nested objects** when properties form a logical group. Use flat naming when the property is standalone or the object is a simple DTO.

#### Correct

```ts
// Nested -- grouped by relationship
interface AgentConfig {
  model: {
    provider: string
    name: string
  }
  tools: {
    maxConcurrency: number
    timeout: number
  }
}

// Flat -- simple DTO, destructuring is primary use
interface CreateAgentParams {
  name: string
  description: string
  systemPrompt: string
}
```

#### Incorrect

```ts
// Concatenated names instead of nesting
interface AgentConfig {
  modelProvider: string
  modelName: string
  toolsMaxConcurrency: number
  toolsTimeout: number
}

// Unnecessary nesting for unrelated properties
interface CreateAgentParams {
  data: {
    name: string
    description: string
  }
}
```

### Directory Structure

Prefer **flat** structure. Only nest when there are 5+ related files or clear sub-domain boundaries.

#### Correct

```
# Flat for simple modules
lib/
├── config.ts
├── resolver.ts
└── types.ts

# Nested for complex modules
core/
├── agent/
│   ├── builder.ts
│   ├── runner.ts
│   └── index.ts
└── workflow/
    ├── executor.ts
    └── index.ts
```

#### Incorrect

```
# Over-nested for no reason
lib/
└── config/
    └── loader/
        └── index.ts
```

### Module File Organization

Each module should have consistent file organization. Keep types in `types.ts`, export public API from `index.ts`, and keep internal types unexported.

#### Correct

```
feature/
├── index.ts      # Public exports
├── types.ts      # Type definitions
├── constants.ts  # Constants
├── schema.ts     # Zod schemas
└── utils.ts      # Helper functions
```

```ts
// types.ts
export interface PublicType {
  // ...
}

interface InternalType {
  // ...
}
```

#### Incorrect

```ts
// Scattering types across multiple files in the same module
// feature/agent-types.ts
export interface AgentType {}

// feature/tool-types.ts
export interface ToolType {}
```

## References

- [Functions](./functions.md) -- Parameter naming conventions
