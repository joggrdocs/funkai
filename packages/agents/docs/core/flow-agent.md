# flowAgent()

`flowAgent()` creates a `FlowAgent` from a configuration object and an imperative handler function. The handler IS the flow agent -- no step arrays, no definition objects. State is just variables. `$` is passed in for tracked operations.

## Signature

```ts
function flowAgent<TInput, TOutput>(
  config: FlowAgentConfig<TInput, TOutput>,
  handler: FlowAgentHandler<TInput, TOutput>,
): FlowAgent<TInput, TOutput>;
```

## FlowAgentConfig

| Field          | Required | Type                                                            | Description                                    |
| -------------- | -------- | --------------------------------------------------------------- | ---------------------------------------------- |
| `name`         | Yes      | `string`                                                        | Unique flow agent name (used in logs, traces)  |
| `input`        | Yes      | `ZodType<TInput>`                                               | Zod schema for validating input             |
| `output`       | Yes      | `ZodType<TOutput>`                                              | Zod schema for validating output            |
| `logger`       | No       | `Logger`                                                        | Pino-compatible logger                      |
| `onStart`      | No       | `(event: { input }) => void \| Promise<void>`                   | Hook: fires when the flow agent starts      |
| `onFinish`     | No       | `(event: { input, output, duration }) => void \| Promise<void>` | Hook: fires on success                      |
| `onError`      | No       | `(event: { input, error }) => void \| Promise<void>`            | Hook: fires on error                        |
| `onStepStart`  | No       | `(event: { step: StepInfo }) => void \| Promise<void>`          | Hook: fires when any `$` step starts        |
| `onStepFinish` | No       | `(event: { step, result, duration }) => void \| Promise<void>`  | Hook: fires when any `$` step finishes      |

## FlowAgentHandler

```ts
type FlowAgentHandler<TInput, TOutput> = (params: FlowAgentParams<TInput>) => Promise<TOutput>;
```

The handler receives `{ input, $ }`:

- `input` -- the validated input after Zod parsing.
- `$` -- the `StepBuilder` for tracked operations (`$.step`, `$.agent`, `$.map`, etc.).

The handler returns `TOutput`, which is validated against the `output` Zod schema before being returned to the caller.

## FlowAgent Interface

```ts
interface FlowAgent<TInput, TOutput> {
  generate(input: TInput, config?: FlowAgentOverrides): Promise<Result<FlowAgentGenerateResult<TOutput>>>;
  stream(input: TInput, config?: FlowAgentOverrides): Promise<Result<FlowAgentStreamResult<TOutput>>>;
  fn(): (input: TInput, config?: FlowAgentOverrides) => Promise<Result<FlowAgentGenerateResult<TOutput>>>;
}
```

### generate()

Runs the flow agent to completion. Returns `Result<FlowAgentGenerateResult<TOutput>>`.

```ts
interface FlowAgentGenerateResult<TOutput> {
  output: TOutput; // validated output
  trace: readonly TraceEntry[]; // frozen execution trace tree
  usage: TokenUsage; // aggregated token usage from all $.agent() calls
  duration: number; // wall-clock time in ms
}
```

On success, `result.ok` is `true` and `output`, `trace`, `duration` are flat on the result object.

### stream()

Runs the flow agent with streaming step progress. Returns `Result<FlowAgentStreamResult<TOutput>>`.

```ts
interface FlowAgentStreamResult<TOutput> {
  output: TOutput; // available after stream completes
  trace: readonly TraceEntry[]; // available after stream completes
  usage: TokenUsage; // aggregated token usage (available after stream completes)
  duration: number; // available after stream completes
  stream: ReadableStream<StepEvent>;
}
```

Subscribe to `stream` for real-time step progress events.

### StepEvent

Events emitted on the flow agent stream:

| Type              | Fields                       | Description               |
| ----------------- | ---------------------------- | ------------------------- |
| `step:start`      | `step: StepInfo`             | A `$` operation started   |
| `step:finish`     | `step`, `result`, `duration` | A `$` operation completed |
| `step:error`      | `step`, `error`              | A `$` operation failed    |
| `flow:finish`     | `output`, `duration`         | The flow agent completed  |

### fn()

Returns a plain function with the same signature as `.generate()`. Use for clean single-function exports.

## FlowAgentOverrides

Per-call overrides passed as the optional second parameter to `.generate()` or `.stream()`.

| Field    | Type          | Description                   |
| -------- | ------------- | ----------------------------- |
| `signal` | `AbortSignal` | Abort signal for cancellation |

When the signal fires, all in-flight `$` operations check `signal.aborted` and abort. The signal propagates through the entire execution tree.

## createFlowEngine()

For custom step types, use `createFlowEngine()`. It returns a `flowAgent()`-like factory with custom methods added to `$`.

```ts
function createFlowEngine<TCustomSteps>(
  config: FlowEngineConfig<TCustomSteps>,
): FlowFactory<TCustomSteps>;
```

### FlowEngineConfig

| Field          | Type                    | Description                     |
| -------------- | ----------------------- | ------------------------------- |
| `$`            | `CustomStepDefinitions` | Custom step types to add to `$` |
| `onStart`      | hook                    | Default hook for all flow agents |
| `onFinish`     | hook                    | Default hook for all flow agents |
| `onError`      | hook                    | Default hook for all flow agents |
| `onStepStart`  | hook                    | Default hook for all flow agents |
| `onStepFinish` | hook                    | Default hook for all flow agents |

Engine-level hooks fire first, then flow agent-level hooks fire second.

Each custom step factory receives `{ ctx: ExecutionContext, config }` where `ExecutionContext` provides the abort signal and scoped logger:

```ts
type CustomStepFactory<TConfig, TResult> = (params: {
  ctx: ExecutionContext;
  config: TConfig;
}) => Promise<TResult>;
```

### Example

```ts
const engine = createFlowEngine({
  $: {
    retry: async ({ ctx, config }) => {
      let lastError: Error | undefined;
      for (let attempt = 0; attempt < config.attempts; attempt++) {
        if (ctx.signal.aborted) throw new Error("Aborted");
        try {
          return await config.execute({ attempt });
        } catch (err) {
          lastError = err as Error;
          await sleep(config.backoff * (attempt + 1));
        }
      }
      throw lastError;
    },
  },
  onStart: ({ input }) => telemetry.trackStart(input),
  onFinish: ({ output, duration }) => telemetry.trackFinish(output, duration),
});

const myFlowAgent = engine(
  {
    name: "my-flow-agent",
    input: MyInput,
    output: MyOutput,
  },
  async ({ input, $ }) => {
    // $.retry is fully typed from the engine config
    const data = await $.retry({
      attempts: 3,
      backoff: 1000,
      execute: async () => fetch("https://api.example.com/data"),
    });
    return data;
  },
);
```

## Full Example

```ts
import { flowAgent, agent, tool } from "@funkai/agents";
import { z } from "zod";

const analyzeAgent = agent({
  name: "analyzer",
  model: "openai/gpt-4.1",
  input: z.object({ files: z.array(z.string()) }),
  prompt: ({ input }) => `Analyze these files:\n${input.files.join("\n")}`,
});

const InputSchema = z.object({ repo: z.string() });
const OutputSchema = z.object({ report: z.string(), fileCount: z.number() });

const reporter = flowAgent(
  {
    name: "reporter",
    input: InputSchema,
    output: OutputSchema,
  },
  async ({ input, $ }) => {
    // $.step for a tracked unit of work
    const files = await $.step({
      id: "list-files",
      execute: async () => listFiles(input.repo),
    });

    if (!files.ok) {
      return { report: "Failed to list files", fileCount: 0 };
    }

    // $.agent for a tracked agent call
    const analysis = await $.agent({
      id: "analyze",
      agent: analyzeAgent,
      input: { files: files.value },
    });

    return {
      report: analysis.ok ? analysis.value.output : "Analysis failed",
      fileCount: files.value.length,
    };
  },
);

const result = await reporter.generate({ repo: "my-org/my-repo" });
```

## References

- [Core Overview](overview.md)
- [Step Builder ($)](step.md)
- [Hooks](hooks.md)
- [Guide: Create a Flow Agent](../guides/create-flow-agent.md)
