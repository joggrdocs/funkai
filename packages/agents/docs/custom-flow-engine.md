# Custom Flow Engine

`createFlowEngine()` builds a custom flow agent factory with additional step types merged into `$` and engine-level default hooks. Custom steps receive an `ExecutionContext` for cancellation and logging, and are fully typed on the handler's `$` parameter.

The engine returns a `FlowFactory` — a function with the same signature as `flowAgent()` but with custom steps and hooks baked in. All flow agents created from the factory share the custom `$` methods and engine-level hooks.

## Basic custom step

```ts
import { createFlowEngine } from "@funkai/agents";
import { z } from "zod";

const engine = createFlowEngine({
  $: {
    fetch: async ({ ctx, config }) => {
      const response = await fetch(config.url, { signal: ctx.signal });
      ctx.log.info("Fetched URL", { url: config.url });
      return response.json();
    },
  },
});

const pipeline = engine(
  {
    name: "data-pipeline",
    input: z.object({ endpoint: z.string() }),
    output: z.object({ data: z.unknown() }),
  },
  async ({ input, $ }) => {
    // $.fetch is fully typed from the engine config
    const data = await $.fetch({ url: input.endpoint });
    return { data };
  },
);
```

## ExecutionContext in custom steps

Custom step factories receive `ExecutionContext` through their `ctx` param. Use `ctx.signal` for cooperative cancellation and `ctx.log` for scoped logging.

```ts
const engine = createFlowEngine({
  $: {
    fetchWithLogging: async ({ ctx, config }) => {
      const response = await fetch(config.url, {
        signal: ctx.signal,
      });
      ctx.log.info("Fetched URL", { url: config.url, status: response.status });
      return response.json();
    },
  },
});
```

Check the signal before long operations to support cooperative cancellation:

```ts
const engine = createFlowEngine({
  $: {
    batchProcess: async ({ ctx, config }) => {
      const results = [];
      for (const item of config.items) {
        if (ctx.signal.aborted) {
          ctx.log.warn("Batch processing cancelled");
          break;
        }
        results.push(await processItem(item));
      }
      return results;
    },
  },
});
```

The logger is scoped automatically. Log output includes execution context without manual threading:

```text
flowAgentId: "content-pipeline"
  stepId: "fetch-sources"
    agentId: "researcher"
```

## Retry step

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
          ctx.log.warn("Retry attempt failed", { attempt, error: lastError.message });
          await sleep(config.backoff * (attempt + 1));
        }
      }
      throw lastError;
    },
  },
});

const flow = engine(
  {
    name: "resilient-flow",
    input: z.object({ query: z.string() }),
    output: z.object({ answer: z.string() }),
  },
  async ({ input, $ }) => {
    const result = await $.retry({
      attempts: 3,
      backoff: 1000,
      execute: async ({ attempt }) => {
        const res = await $.agent({
          id: `generate-${attempt}`,
          agent: writer,
          input: input.query,
        });
        if (!res.ok) throw new Error(res.error.message);
        return res.output;
      },
    });
    return { answer: result };
  },
);
```

## Timeout step

```ts
const engine = createFlowEngine({
  $: {
    timeout: async ({ ctx, config }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.ms);

      // Propagate parent cancellation into the timeout controller
      ctx.signal.addEventListener("abort", () => controller.abort());

      try {
        return await config.execute({ signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    },
  },
});
```

## Engine-level hooks

Attach telemetry or logging at the engine level so all flow agents created from the factory share the same hooks. Engine hooks fire first, then flow agent-level hooks fire second. Each hook is independently error-swallowed so one failure does not prevent others from running.

```ts
const engine = createFlowEngine({
  onStart: ({ input }) => {
    telemetry.trackStart(input);
  },
  onFinish: ({ input, result, duration }) => {
    telemetry.trackFinish({ input, duration });
  },
  onError: ({ error }) => {
    errorReporter.capture(error);
  },
  onStepStart: ({ stepId, stepOperation }) => {
    telemetry.trackStepStart(stepId, stepOperation);
  },
  onStepFinish: ({ stepId, stepOperation, duration }) => {
    telemetry.trackStepFinish(stepId, duration);
  },
});
```

## Combining custom steps and hooks

```ts
const engine = createFlowEngine({
  $: {
    retry: async ({ ctx, config }) => {
      let lastError: Error | undefined;
      for (let attempt = 0; attempt < config.attempts; attempt++) {
        try {
          return await config.execute({ attempt });
        } catch (err) {
          lastError = err as Error;
          ctx.log.warn("Retry failed", { attempt });
        }
      }
      throw lastError;
    },
    validate: async ({ config }) => {
      const parsed = config.schema.safeParse(config.data);
      if (!parsed.success) throw new Error(parsed.error.message);
      return parsed.data;
    },
  },
  onStart: ({ input }) => metrics.increment("flow.started"),
  onFinish: ({ duration }) => metrics.histogram("flow.duration", duration),
});

const myFlowAgent = engine(
  {
    name: "my-flow-agent",
    input: MyInput,
    output: MyOutput,
  },
  async ({ input, $ }) => {
    // Both $.retry and $.validate are typed
    const data = await $.retry({
      attempts: 3,
      execute: async () => fetchData(),
    });
    const validated = await $.validate({ schema: DataSchema, data });
    return validated;
  },
);
```

---

## Reference: `createFlowEngine()` signature

```ts
function createFlowEngine<TCustomSteps>(
  config: FlowEngineConfig<TCustomSteps>,
): FlowFactory<TCustomSteps>;
```

## Reference: FlowEngineConfig

| Field          | Type                    | Description                                      |
| -------------- | ----------------------- | ------------------------------------------------ |
| `$`            | `CustomStepDefinitions` | Custom step types to add to `$`                  |
| `onStart`      | hook                    | Default hook: fires when any flow agent starts   |
| `onFinish`     | hook                    | Default hook: fires when any flow agent finishes |
| `onError`      | hook                    | Default hook: fires when any flow agent errors   |
| `onStepStart`  | hook                    | Default hook: fires when any step starts         |
| `onStepFinish` | hook                    | Default hook: fires when any step finishes       |

## Reference: CustomStepFactory

The type for a custom step implementation:

```ts
type CustomStepFactory<TConfig, TResult> = (params: {
  ctx: ExecutionContext;
  config: TConfig;
}) => Promise<TResult>;
```

| Param    | Type               | Description                                        |
| -------- | ------------------ | -------------------------------------------------- |
| `ctx`    | `ExecutionContext` | Provides `signal` (AbortSignal) and `log` (Logger) |
| `config` | `TConfig`          | The config object passed by the user at call site  |

## Reference: ExecutionContext

The public context interface exposed to custom step factories:

```ts
interface ExecutionContext {
  readonly signal: AbortSignal;
  readonly log: Logger;
}
```

| Field    | Type          | Description                               |
| -------- | ------------- | ----------------------------------------- |
| `signal` | `AbortSignal` | Abort signal for cooperative cancellation |
| `log`    | `Logger`      | Scoped logger with contextual bindings    |

### Signal propagation

The abort signal cascades through the entire execution tree. When a flow agent receives a `signal` via overrides, it becomes the `signal` on the context. All nested `$` operations and sub-agent calls observe the same signal.

```ts
const controller = new AbortController();

const result = await myFlowAgent.generate({
  input,
  signal: controller.signal,
});

// Cancels all in-flight operations
controller.abort();
```

## Reserved step names

Custom steps cannot shadow built-in `StepBuilder` methods. The following names are reserved and will throw at engine creation time:

`step`, `agent`, `map`, `each`, `reduce`, `while`, `all`, `race`

---

## See also

- [Create a Flow Agent](create-flow-agent.md)
- [Create an Agent](create-agent.md)
- [Hooks](hooks.md)
