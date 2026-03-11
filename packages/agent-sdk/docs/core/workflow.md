# workflow()

`workflow()` creates a `Workflow` from a configuration object and an imperative handler function. The handler IS the workflow -- no step arrays, no definition objects. State is just variables. `$` is passed in for tracked operations.

## Signature

```ts
function workflow<TInput, TOutput>(
  config: WorkflowConfig<TInput, TOutput>,
  handler: WorkflowHandler<TInput, TOutput>
): Workflow<TInput, TOutput>
```

## WorkflowConfig

| Field          | Required | Type                                                            | Description                                 |
| -------------- | -------- | --------------------------------------------------------------- | ------------------------------------------- |
| `name`         | Yes      | `string`                                                        | Unique workflow name (used in logs, traces) |
| `input`        | Yes      | `ZodType<TInput>`                                               | Zod schema for validating input             |
| `output`       | Yes      | `ZodType<TOutput>`                                              | Zod schema for validating output            |
| `logger`       | No       | `Logger`                                                        | Pino-compatible logger                      |
| `onStart`      | No       | `(event: { input }) => void \| Promise<void>`                   | Hook: fires when the workflow starts        |
| `onFinish`     | No       | `(event: { input, output, duration }) => void \| Promise<void>` | Hook: fires on success                      |
| `onError`      | No       | `(event: { input, error }) => void \| Promise<void>`            | Hook: fires on error                        |
| `onStepStart`  | No       | `(event: { step: StepInfo }) => void \| Promise<void>`          | Hook: fires when any `$` step starts        |
| `onStepFinish` | No       | `(event: { step, result, duration }) => void \| Promise<void>`  | Hook: fires when any `$` step finishes      |

## WorkflowHandler

```ts
type WorkflowHandler<TInput, TOutput> = (params: WorkflowParams<TInput>) => Promise<TOutput>
```

The handler receives `{ input, $ }`:

- `input` -- the validated input after Zod parsing.
- `$` -- the `StepBuilder` for tracked operations (`$.step`, `$.agent`, `$.map`, etc.).

The handler returns `TOutput`, which is validated against the `output` Zod schema before being returned to the caller.

## Workflow Interface

```ts
interface Workflow<TInput, TOutput> {
  generate(input: TInput, config?: WorkflowOverrides): Promise<Result<WorkflowResult<TOutput>>>
  stream(input: TInput, config?: WorkflowOverrides): Promise<Result<WorkflowStreamResult<TOutput>>>
  fn(): (input: TInput, config?: WorkflowOverrides) => Promise<Result<WorkflowResult<TOutput>>>
}
```

### generate()

Runs the workflow to completion. Returns `Result<WorkflowResult<TOutput>>`.

```ts
interface WorkflowResult<TOutput> {
  output: TOutput // validated output
  trace: readonly TraceEntry[] // frozen execution trace tree
  usage: TokenUsage // aggregated token usage from all $.agent() calls
  duration: number // wall-clock time in ms
}
```

On success, `result.ok` is `true` and `output`, `trace`, `duration` are flat on the result object.

### stream()

Runs the workflow with streaming step progress. Returns `Result<WorkflowStreamResult<TOutput>>`.

```ts
interface WorkflowStreamResult<TOutput> {
  output: TOutput // available after stream completes
  trace: readonly TraceEntry[] // available after stream completes
  usage: TokenUsage // aggregated token usage (available after stream completes)
  duration: number // available after stream completes
  stream: ReadableStream<StepEvent>
}
```

Subscribe to `stream` for real-time step progress events.

### StepEvent

Events emitted on the workflow stream:

| Type              | Fields                       | Description               |
| ----------------- | ---------------------------- | ------------------------- |
| `step:start`      | `step: StepInfo`             | A `$` operation started   |
| `step:finish`     | `step`, `result`, `duration` | A `$` operation completed |
| `step:error`      | `step`, `error`              | A `$` operation failed    |
| `workflow:finish` | `output`, `duration`         | The workflow completed    |

### fn()

Returns a plain function with the same signature as `.generate()`. Use for clean single-function exports.

## WorkflowOverrides

Per-call overrides passed as the optional second parameter to `.generate()` or `.stream()`.

| Field    | Type          | Description                   |
| -------- | ------------- | ----------------------------- |
| `signal` | `AbortSignal` | Abort signal for cancellation |

When the signal fires, all in-flight `$` operations check `signal.aborted` and abort. The signal propagates through the entire execution tree.

## createWorkflowEngine()

For custom step types, use `createWorkflowEngine()`. It returns a `workflow()`-like factory with custom methods added to `$`.

```ts
function createWorkflowEngine<TCustomSteps>(
  config: EngineConfig<TCustomSteps>
): WorkflowFactory<TCustomSteps>
```

### EngineConfig

| Field          | Type                    | Description                     |
| -------------- | ----------------------- | ------------------------------- |
| `$`            | `CustomStepDefinitions` | Custom step types to add to `$` |
| `onStart`      | hook                    | Default hook for all workflows  |
| `onFinish`     | hook                    | Default hook for all workflows  |
| `onError`      | hook                    | Default hook for all workflows  |
| `onStepStart`  | hook                    | Default hook for all workflows  |
| `onStepFinish` | hook                    | Default hook for all workflows  |

Engine-level hooks fire first, then workflow-level hooks fire second.

Each custom step factory receives `{ ctx: ExecutionContext, config }` where `ExecutionContext` provides the abort signal and scoped logger:

```ts
type CustomStepFactory<TConfig, TResult> = (params: {
  ctx: ExecutionContext
  config: TConfig
}) => Promise<TResult>
```

### Example

```ts
const engine = createWorkflowEngine({
  $: {
    retry: async ({ ctx, config }) => {
      let lastError: Error | undefined
      for (let attempt = 0; attempt < config.attempts; attempt++) {
        if (ctx.signal.aborted) throw new Error('Aborted')
        try {
          return await config.execute({ attempt })
        } catch (err) {
          lastError = err as Error
          await sleep(config.backoff * (attempt + 1))
        }
      }
      throw lastError
    },
  },
  onStart: ({ input }) => telemetry.trackStart(input),
  onFinish: ({ output, duration }) => telemetry.trackFinish(output, duration),
})

const myWorkflow = engine(
  {
    name: 'my-workflow',
    input: MyInput,
    output: MyOutput,
  },
  async ({ input, $ }) => {
    // $.retry is fully typed from the engine config
    const data = await $.retry({
      attempts: 3,
      backoff: 1000,
      execute: async () => fetch('https://api.example.com/data'),
    })
    return data
  }
)
```

## Full Example

```ts
import { workflow, agent, tool } from '@joggr/agent-sdk'
import { z } from 'zod'

const analyzeAgent = agent({
  name: 'analyzer',
  model: 'openai/gpt-4.1',
  input: z.object({ files: z.array(z.string()) }),
  prompt: ({ input }) => `Analyze these files:\n${input.files.join('\n')}`,
})

const InputSchema = z.object({ repo: z.string() })
const OutputSchema = z.object({ report: z.string(), fileCount: z.number() })

const reporter = workflow(
  {
    name: 'reporter',
    input: InputSchema,
    output: OutputSchema,
  },
  async ({ input, $ }) => {
    // $.step for a tracked unit of work
    const files = await $.step({
      id: 'list-files',
      execute: async () => listFiles(input.repo),
    })

    if (!files.ok) {
      return { report: 'Failed to list files', fileCount: 0 }
    }

    // $.agent for a tracked agent call
    const analysis = await $.agent({
      id: 'analyze',
      agent: analyzeAgent,
      input: { files: files.value },
    })

    return {
      report: analysis.ok ? analysis.value.output : 'Analysis failed',
      fileCount: files.value.length,
    }
  }
)

const result = await reporter.generate({ repo: 'my-org/my-repo' })
```

## References

- [Core Overview](overview.md)
- [Step Builder ($)](step.md)
- [Hooks](hooks.md)
- [Guide: Create a Workflow](../guides/create-workflow.md)
