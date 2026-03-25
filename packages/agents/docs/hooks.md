# Hooks

Hooks provide lifecycle callbacks for agents, flow agents, and steps. All hooks are optional. Hook errors are swallowed (logged via `attemptEachAsync`, never thrown) so they never mask the original error or interrupt execution.

## Agent Hooks

Set on `AgentConfig`:

| Hook           | Event fields                  | When                                                                         |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `onStart`      | `{ input }`                   | Before the model is called                                                   |
| `onFinish`     | `{ input, result, duration }` | After successful generation                                                  |
| `onError`      | `{ input, error }`            | On error, before Result is returned                                          |
| `onStepFinish` | `{ stepId }`                  | After each tool-loop step (counter-based: `agentName:0`, `agentName:1`, ...) |

## Flow Agent Hooks

Set on `FlowAgentConfig`:

| Hook           | Event fields                           | When                                                  |
| -------------- | -------------------------------------- | ----------------------------------------------------- |
| `onStart`      | `{ input }`                            | After input validation, before handler runs           |
| `onFinish`     | `{ input, result, duration }`          | After successful completion                           |
| `onError`      | `{ input, error }`                     | On error, before Result is returned                   |
| `onStepStart`  | `StepStartEvent` (`{ stepId, stepOperation, agentChain? }`) | Before any `$` operation executes                     |
| `onStepFinish` | `StepFinishEvent` (`{ stepId, stepOperation, output, duration }`) | After any `$` operation completes (success AND error) |

`onStepFinish` fires on both success and error. On error, `output` is `undefined`. `stepId` is always required (never optional).

## Step-Level Hooks

Each `$` config accepts its own hooks:

| Hook       | Event fields               | When                       |
| ---------- | -------------------------- | -------------------------- |
| `onStart`  | `{ id }`                   | Before the step executes   |
| `onFinish` | `{ id, result, duration }` | After successful execution |
| `onError`  | `{ id, error }`            | On error                   |

These are available on `$.step`, `$.agent`, `$.map`, `$.each`, `$.reduce`, `$.while`, `$.all`, and `$.race`.

## Per-Call Hooks

Agent per-call hooks are set on the `GenerateParams` object passed to `.generate()` or `.stream()`. They have the same names as the base hooks but fire **after** the base hooks.

```ts
await myAgent.generate({
  prompt: "hello",
  onStart: ({ input }) => console.log("call-level start"),
  onFinish: ({ result, duration }) => console.log(`call done in ${duration}ms`),
});
```

## Hook Merging

Per-call hooks merge with base hooks -- base fires first, then call-level. Both are independently wrapped with `attemptEachAsync`, so an error in one hook does not prevent the other from running.

For flow engines created with `createFlowEngine()`, engine-level hooks fire first, then flow agent-level hooks fire second.

## Hook Execution Order

For a `$.agent` call inside a flow agent:

```
step.onStart -> flowAgent.onStepStart -> execute -> step.onFinish -> flowAgent.onStepFinish
```

On error, the sequence diverges:

```
step.onStart -> flowAgent.onStepStart -> execute (throws) -> step.onError -> flowAgent.onStepFinish
```

For an agent's tool-loop steps:

```
base.onStepFinish -> overrides.onStepFinish
```

The `stepId` for agent tool-loop steps is counter-based: `agentName:0`, `agentName:1`, etc.

## Sub-Agent Hook Forwarding

When a parent agent has sub-agents (via the `agents` config), those sub-agents are wrapped as tools. The parent forwards a subset of its hooks to each sub-agent so internal activity is observable.

### What gets forwarded (safe -- fixed event types)

| Hook           | Event type        | Why safe                               |
| -------------- | ----------------- | -------------------------------------- |
| `onStepStart`  | `StepStartEvent`  | Fixed type, same shape for every agent |
| `onStepFinish` | `StepFinishEvent` | Fixed type, same shape for every agent |
| `logger`       | `Logger`          | No event type, just a logger instance  |

These hooks are passed directly into `child.generate()` as per-call hooks. The parent's `onStepFinish` is merged (config + per-call) before forwarding, so both the config-level and call-level hooks fire for sub-agent steps.

### What stays at the parent (not forwarded -- generic event types)

| Hook       | Event type                                                     | Why not forwarded                         |
| ---------- | -------------------------------------------------------------- | ----------------------------------------- |
| `onStart`  | `{ input: TInput }`                                            | `TInput` differs between parent and child |
| `onFinish` | `{ input: TInput, result: GenerateResult<TOutput>, duration }` | Both `TInput` and `TOutput` differ        |
| `onError`  | `{ input: TInput, error: Error }`                              | `TInput` differs between parent and child |

These hooks are parameterized by the agent's generic types (`TInput`, `TOutput`). A parent typed `Agent<{ userId: string }>` would have `onStart: (e: { input: { userId: string } }) => void`, but a sub-agent might expect `{ query: string }`. Forwarding the parent's hook to the child would cause the hook to receive the wrong event shape at runtime -- the compiler cannot catch this because the type boundary is erased when hooks cross agent boundaries.

Sub-agent lifecycle activity is still observable at the parent level through `onStepFinish`, which fires for each tool-loop step including sub-agent tool calls and their results.

### Lifecycle diagram

```
Parent.generate({ input, onStepFinish })
  |
  +-- Parent fires own onStart({ input })         <- parent's TInput, type-safe
  |
  +-- generateText() runs tool loop
  |     |
  |     +-- Step 0: LLM calls sub-agent tool
  |     |     |
  |     |     |  Passed into child.generate():
  |     |     |    logger       -> parent's logger
  |     |     |    onStepStart  -> parent's onStepStart (StepStartEvent -- fixed type)
  |     |     |    onStepFinish -> parent's merged onStepFinish (StepFinishEvent -- fixed type)
  |     |     |
  |     |     |  NOT passed:
  |     |     |    onStart, onFinish, onError (generic types -- would break type safety)
  |     |     |
  |     |     +-- Child fires own onStart({ input })  <- child's TInput, type-safe
  |     |     +-- Child runs tool loop
  |     |     |     +-- Child step 0 -> parent's onStepFinish fires (StepFinishEvent)
  |     |     |     +-- Child step 1 -> parent's onStepFinish fires (StepFinishEvent)
  |     |     +-- Child fires own onFinish(...)        <- child's types, type-safe
  |     |     +-- Returns result to parent
  |     |
  |     +-- Parent's onStepFinish fires for step 0 (includes sub-agent tool result)
  |
  +-- Parent fires own onFinish({ input, result })  <- parent's TInput/TOutput, type-safe
  |
  +-- Returns Result to caller
```

## Error Handling

All hooks are executed via `attemptEachAsync`, which:

1. Runs each hook sequentially.
2. Catches and swallows any errors -- hook failures never propagate.
3. Skips `undefined` hooks (no null checks needed at call sites).

This means a failing hook will never mask the original error or prevent other hooks from running.

## References

- [Create an Agent](create-agent.md)
- [Create a Flow Agent](create-flow-agent.md)
- [Step Builder ($)](step-builder.md)
