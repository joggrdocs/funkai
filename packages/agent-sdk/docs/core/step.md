# $ StepBuilder

The `$` object is passed into every workflow handler and step callback. It provides tracked operations that register data flow in the execution trace. Every call through `$` becomes a `TraceEntry`.

`$` is passed into every callback, enabling composition and nesting. You can always skip `$` and use plain imperative code -- it just will not appear in the trace.

## StepResult

All `$` methods return `Promise<StepResult<T>>`:

```ts
type StepResult<T> =
  | { ok: true; value: T; step: StepInfo; duration: number }
  | { ok: false; error: StepError; step: StepInfo; duration: number }
```

`StepInfo` identifies the step:

```ts
interface StepInfo {
  id: string // from the $ config's `id` field
  index: number // auto-incrementing within the workflow
  type: OperationType // 'step' | 'agent' | 'map' | 'each' | 'reduce' | 'while' | 'all' | 'race'
}
```

`StepError` extends `ResultError` with `stepId: string`.

## $.step

Single unit of work.

```ts
$.step<T>(config: StepConfig<T>): Promise<StepResult<T>>
```

| Field      | Required | Type                                                         | Description                  |
| ---------- | -------- | ------------------------------------------------------------ | ---------------------------- |
| `id`       | Yes      | `string`                                                     | Unique step identifier       |
| `execute`  | Yes      | `(params: { $ }) => Promise<T>`                              | The step's logic             |
| `onStart`  | No       | `(event: { id }) => void \| Promise<void>`                   | Hook: fires when step starts |
| `onFinish` | No       | `(event: { id, result, duration }) => void \| Promise<void>` | Hook: fires on success       |
| `onError`  | No       | `(event: { id, error }) => void \| Promise<void>`            | Hook: fires on error         |

```ts
const data = await $.step({
  id: 'fetch-data',
  execute: async () => {
    return await fetchData()
  },
})

if (data.ok) {
  console.log(data.value) // T
}
```

## $.agent

Agent call as a tracked operation. Calls `agent.generate()` internally and unwraps the result -- agent errors become `StepError`, agent success becomes `StepResult<GenerateResult>`.

```ts
$.agent<TInput>(config: AgentStepConfig<TInput>): Promise<StepResult<GenerateResult>>
```

| Field      | Required | Type               | Description                          |
| ---------- | -------- | ------------------ | ------------------------------------ |
| `id`       | Yes      | `string`           | Unique step identifier               |
| `agent`    | Yes      | `Runnable<TInput>` | The agent (or workflow) to invoke    |
| `input`    | Yes      | `TInput`           | Input to pass to the agent           |
| `config`   | No       | `AgentOverrides`   | Inline overrides for this agent call |
| `onStart`  | No       | hook               | Hook: fires when step starts         |
| `onFinish` | No       | hook               | Hook: fires on success               |
| `onError`  | No       | hook               | Hook: fires on error                 |

The framework automatically passes the abort signal and a scoped logger to the agent.

```ts
const result = await $.agent({
  id: 'analyze',
  agent: analyzerAgent,
  input: { files: ['src/main.ts'] },
})

if (result.ok) {
  console.log(result.value.output) // the agent's output
  console.log(result.value.messages) // full message history
}
```

## $.map

Parallel map with optional concurrency limit. All items run concurrently (up to `concurrency` limit). Returns results in input order.

```ts
$.map<T, R>(config: MapConfig<T, R>): Promise<StepResult<R[]>>
```

| Field         | Required | Type                                         | Description                                 |
| ------------- | -------- | -------------------------------------------- | ------------------------------------------- |
| `id`          | Yes      | `string`                                     | Unique step identifier                      |
| `input`       | Yes      | `T[]`                                        | Array of items to process                   |
| `execute`     | Yes      | `(params: { item, index, $ }) => Promise<R>` | Process a single item                       |
| `concurrency` | No       | `number`                                     | Max parallel executions (default: Infinity) |
| `onStart`     | No       | hook                                         | Hook: fires when map starts                 |
| `onFinish`    | No       | hook                                         | Hook: fires when all items complete         |
| `onError`     | No       | hook                                         | Hook: fires on error                        |

```ts
const results = await $.map({
  id: 'process-files',
  input: files,
  concurrency: 5,
  execute: async ({ item, index }) => {
    return await processFile(item)
  },
})
```

## $.each

Sequential side effects. Runs items one at a time in order. Returns `void`. Checks abort signal before each iteration.

```ts
$.each<T>(config: EachConfig<T>): Promise<StepResult<void>>
```

| Field      | Required | Type                                            | Description                   |
| ---------- | -------- | ----------------------------------------------- | ----------------------------- |
| `id`       | Yes      | `string`                                        | Unique step identifier        |
| `input`    | Yes      | `T[]`                                           | Array of items to process     |
| `execute`  | Yes      | `(params: { item, index, $ }) => Promise<void>` | Process a single item         |
| `onStart`  | No       | hook                                            | Hook: fires when each starts  |
| `onFinish` | No       | hook                                            | Hook: fires when all complete |
| `onError`  | No       | hook                                            | Hook: fires on error          |

```ts
await $.each({
  id: 'notify-users',
  input: users,
  execute: async ({ item }) => {
    await sendNotification(item.email)
  },
})
```

## $.reduce

Sequential accumulation. Each step depends on the previous result. Checks abort signal before each iteration.

```ts
$.reduce<T, R>(config: ReduceConfig<T, R>): Promise<StepResult<R>>
```

| Field      | Required | Type                                                      | Description                    |
| ---------- | -------- | --------------------------------------------------------- | ------------------------------ |
| `id`       | Yes      | `string`                                                  | Unique step identifier         |
| `input`    | Yes      | `T[]`                                                     | Array of items to reduce       |
| `initial`  | Yes      | `R`                                                       | Initial accumulator value      |
| `execute`  | Yes      | `(params: { item, accumulator, index, $ }) => Promise<R>` | Reduce function                |
| `onStart`  | No       | hook                                                      | Hook: fires when reduce starts |
| `onFinish` | No       | hook                                                      | Hook: fires when done          |
| `onError`  | No       | hook                                                      | Hook: fires on error           |

```ts
const total = await $.reduce({
  id: 'sum-scores',
  input: items,
  initial: 0,
  execute: async ({ item, accumulator }) => {
    return accumulator + item.score
  },
})
```

## $.while

Conditional loop. Runs while a condition holds. Returns the last value, or `undefined` if the condition was false on first check. Checks abort signal before each iteration.

```ts
$.while<T>(config: WhileConfig<T>): Promise<StepResult<T | undefined>>
```

| Field       | Required | Type                                    | Description                                    |
| ----------- | -------- | --------------------------------------- | ---------------------------------------------- |
| `id`        | Yes      | `string`                                | Unique step identifier                         |
| `condition` | Yes      | `(params: { value, index }) => boolean` | Loop condition (checked before each iteration) |
| `execute`   | Yes      | `(params: { index, $ }) => Promise<T>`  | Execute one iteration                          |
| `onStart`   | No       | hook                                    | Hook: fires when while starts                  |
| `onFinish`  | No       | hook                                    | Hook: fires when loop ends                     |
| `onError`   | No       | hook                                    | Hook: fires on error                           |

The `condition` receives the last iteration's value (or `undefined` before the first iteration) and the current iteration index.

```ts
const result = await $.while({
  id: 'poll-status',
  condition: ({ value, index }) => index < 10 && value !== 'complete',
  execute: async ({ index }) => {
    await sleep(1000)
    return await checkStatus()
  },
})
```

## $.all

Concurrent heterogeneous operations -- like `Promise.all`. Entries are factory functions that receive an `AbortSignal` and return a promise. The framework creates an `AbortController`, links it to the parent signal, and starts all factories at the same time.

```ts
$.all(config: AllConfig): Promise<StepResult<unknown[]>>
```

| Field      | Required | Type             | Description                           |
| ---------- | -------- | ---------------- | ------------------------------------- |
| `id`       | Yes      | `string`         | Unique step identifier                |
| `entries`  | Yes      | `EntryFactory[]` | Factory functions to run concurrently |
| `onStart`  | No       | hook             | Hook: fires when all starts           |
| `onFinish` | No       | hook             | Hook: fires when all complete         |
| `onError`  | No       | hook             | Hook: fires on error                  |

Where `EntryFactory = (signal: AbortSignal) => Promise<any>`.

```ts
const [users, repos] = await $.all({
  id: 'fetch-data',
  entries: [(signal) => fetchUsers(signal), (signal) => fetchRepos(signal)],
})
```

## $.race

First-to-finish wins. Same `entries: EntryFactory[]` pattern as `$.all`. Losers are cancelled via abort signal when the winner resolves.

```ts
$.race(config: RaceConfig): Promise<StepResult<unknown>>
```

| Field      | Required | Type             | Description                      |
| ---------- | -------- | ---------------- | -------------------------------- |
| `id`       | Yes      | `string`         | Unique step identifier           |
| `entries`  | Yes      | `EntryFactory[]` | Factory functions to race        |
| `onStart`  | No       | hook             | Hook: fires when race starts     |
| `onFinish` | No       | hook             | Hook: fires when winner resolves |
| `onError`  | No       | hook             | Hook: fires on error             |

```ts
const result = await $.race({
  id: 'fastest-provider',
  entries: [(signal) => fetchFromProviderA(signal), (signal) => fetchFromProviderB(signal)],
})

if (result.ok) {
  const fastest = result.value
}
```

## Nesting

`$` is passed into every callback so you can nest operations freely. Nested operations appear as `children` in the parent's trace entry.

```ts
const result = await $.step({
  id: 'outer',
  execute: async ({ $ }) => {
    const inner = await $.step({
      id: 'inner',
      execute: async () => 'nested value',
    })
    return inner.ok ? inner.value : 'fallback'
  },
})
```

## References

- [Workflow](workflow.md)
- [Hooks](hooks.md)
- [Core Overview](overview.md)
