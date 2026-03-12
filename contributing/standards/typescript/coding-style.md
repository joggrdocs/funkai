# Coding Style

## Overview

High-level constraints that govern all TypeScript in the monorepo. The goal is a strict functional style: pure, immutable, declarative, with side effects pushed to the edges.

## Rules

### No `let` -- Use `const` Only

All bindings must be `const`. No reassignment, no mutation. Mutable state inside closures (factory internals) is the one accepted exception.

#### Correct

```ts
const timeout = 5000
const steps = workflow.steps.filter(isEnabled)
```

#### Incorrect

```ts
let timeout = 5000
timeout = 10000

let steps: Step[] = []
steps.push(newStep)
```

### No Loops

Use `map`, `filter`, `reduce`, `flatMap`, and `es-toolkit` utilities instead of `for`, `while`, `do...while`, `for...in`, or `for...of`.

#### Correct

```ts
const names = steps.map((s) => s.name)
const enabled = steps.filter((s) => s.enabled)
const total = items.reduce((sum, item) => sum + item.count, 0)
```

#### Incorrect

```ts
const names: string[] = []
for (const step of steps) {
  names.push(step.name)
}
```

### No Classes

Use plain objects, closures, and factory functions. Classes are permitted only when wrapping an external SDK that requires instantiation (e.g., from the `ai` SDK).

| Anti-pattern              | Use Instead                |
| ------------------------- | -------------------------- |
| Utility classes           | Module with functions      |
| Static method collections | Module with functions      |
| Data containers           | Plain objects / interfaces |
| Singletons                | Module-level constants     |

#### Correct

```ts
export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

#### Incorrect

```ts
class StringUtils {
  static capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
}
```

### No `this`

Never reference `this`. Factory closures and plain functions eliminate the need.

### Immutable Data

Do not mutate objects or arrays after creation. Return new values from every transformation.

#### Correct

```ts
function addStep(steps: readonly Step[], step: Step): readonly Step[] {
  return [...steps, step]
}
```

#### Incorrect

```ts
function addStep(steps: Step[], step: Step) {
  steps.push(step)
}
```

### No `any`

Use `unknown`, generics, or proper types. Narrow with type guards when needed.

#### Correct

```ts
function parse(data: unknown): Result<AgentConfig, ParseError> {
  if (!isPlainObject(data)) {
    return [{ type: 'parse_error', message: 'Expected object' }, null]
  }
  return [null, validateConfig(data)]
}
```

#### Incorrect

```ts
function parse(data: any): AgentConfig {
  return data
}
```

### Prefer Point-Free Style

When passing a named function to a higher-order function, pass it directly instead of wrapping in an arrow.

#### Correct

```ts
const valid = steps.filter(isEnabled)
const names = items.map(getName)
```

#### Incorrect

```ts
const valid = steps.filter((s) => isEnabled(s))
const names = items.map((item) => getName(item))
```

### ESM Only

Use ES module syntax with `verbatimModuleSyntax`. Use `import type` for type-only imports. Prefer the `node:` protocol for Node.js builtins.

#### Correct

```ts
import type { AgentConfig } from './types'
import { readFile } from 'node:fs/promises'
import { createAgent } from './lib/agent'
```

#### Incorrect

```ts
const fs = require('fs')
import { AgentConfig } from './types' // should use import type
import { readFile } from 'fs' // should use node: protocol
```

### No IIFEs

Do not use immediately invoked function expressions. Extract the logic into a named function and call it explicitly. This applies to both sync and async IIFEs.

#### Correct

```ts
/**
 * @private
 */
async function execute(options: Options): Promise<void> {
  // ...
}

function start(options: Options): void {
  void execute(options)
}
```

#### Incorrect

```ts
function start(options: Options): void {
  void (async () => {
    // ...
  })()
}
```

### Import Ordering

Organize imports into three groups separated by blank lines, sorted alphabetically within each group. Use top-level `import type` statements -- do not use inline type specifiers.

1. **Node builtins** -- `node:` protocol imports
2. **External packages** -- third-party dependencies
3. **Internal imports** -- project-relative paths, ordered farthest-to-closest (`../` before `./`), then alphabetically within the same depth

#### Correct

```ts
import { readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

import { isPlainObject } from 'es-toolkit'
import { match } from 'ts-pattern'

import type { AgentConfig } from '../types.js'
import { createProvider } from '../lib/provider.js'
import { resolveModel } from './models.js'
import type { ResolvedTool } from './tools.js'
```

#### Incorrect

```ts
import { match } from 'ts-pattern'
import { readdir } from 'node:fs/promises' // node: should be first
import { resolveModel } from './models.js'
import type { AgentConfig } from '../types.js' // ../ should come before ./
import { isPlainObject } from 'es-toolkit'
import { createProvider, type Provider } from '../lib/provider.js' // no inline type specifiers
```

### File Structure

Organize each source file in this order:

1. **Imports** -- ordered per import rules above
2. **Module-level constants** -- `const` bindings used throughout the file
3. **Exported functions** -- the public API, each with full JSDoc
4. **Section separator** -- `// ---------------------------------------------------------------------------`
5. **Private helpers** -- non-exported functions, each with JSDoc including `@private`

Exported functions appear first so readers see the public API without scrolling. Private helpers are implementation details pushed to the bottom. Function declarations are hoisted, so calling order does not matter.

#### Correct

```ts
import type { AgentConfig } from '../types.js'

const DEFAULT_MODEL = 'openai/gpt-4o'

/**
 * Load and validate an agent configuration.
 *
 * @param path - Absolute path to the config file.
 * @returns The validated agent configuration.
 */
export function loadConfig(path: string): AgentConfig {
  const raw = readRawConfig(path)
  return validateConfig(raw)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Read the raw config file from disk.
 *
 * @private
 * @param path - Absolute path to read.
 * @returns The raw config string.
 */
function readRawConfig(path: string): string {
  // ...
}

/**
 * Validate a raw config string against the schema.
 *
 * @private
 * @param raw - Unvalidated config string.
 * @returns A validated AgentConfig object.
 */
function validateConfig(raw: string): AgentConfig {
  // ...
}
```

#### Incorrect

```ts
// Private helper defined before exports -- reader must scroll to find the API
function readRawConfig(path: string): string {
  /* ... */
}
function validateConfig(raw: string): AgentConfig {
  /* ... */
}

export function loadConfig(path: string): AgentConfig {
  const raw = readRawConfig(path)
  return validateConfig(raw)
}
```

## References

- [Design Patterns](./design-patterns.md) -- Factories, pipelines, composition
- [Errors](./errors.md) -- Error handling patterns
- [State](./state.md) -- Immutable state management
- [Functions](./functions.md) -- Pure functions and composition
