# Hooks

Hooks provide lifecycle callbacks for agents, workflows, and steps. All hooks are optional. Hook errors are swallowed (logged via `attemptEachAsync`, never thrown) so they never mask the original error or interrupt execution.

## Agent Hooks

Set on `AgentConfig`:

| Hook           | Event fields                  | When                                                                         |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `onStart`      | `{ input }`                   | Before the model is called                                                   |
| `onFinish`     | `{ input, result, duration }` | After successful generation                                                  |
| `onError`      | `{ input, error }`            | On error, before Result is returned                                          |
| `onStepFinish` | `{ stepId }`                  | After each tool-loop step (counter-based: `agentName:0`, `agentName:1`, ...) |

## Workflow Hooks

Set on `WorkflowConfig`:

| Hook           | Event fields                           | When                                                  |
| -------------- | -------------------------------------- | ----------------------------------------------------- |
| `onStart`      | `{ input }`                            | After input validation, before handler runs           |
| `onFinish`     | `{ input, output, duration }`          | After successful completion                           |
| `onError`      | `{ input, error }`                     | On error, before Result is returned                   |
| `onStepStart`  | `{ step: StepInfo }`                   | Before any `$` operation executes                     |
| `onStepFinish` | `{ step: StepInfo, result, duration }` | After any `$` operation completes (success AND error) |

`onStepFinish` fires on both success and error. On error, `result` is `undefined`.

## Step-Level Hooks

Each `$` config accepts its own hooks:

| Hook       | Event fields               | When                       |
| ---------- | -------------------------- | -------------------------- |
| `onStart`  | `{ id }`                   | Before the step executes   |
| `onFinish` | `{ id, result, duration }` | After successful execution |
| `onError`  | `{ id, error }`            | On error                   |

These are available on `$.step`, `$.agent`, `$.map`, `$.each`, `$.reduce`, `$.while`, `$.all`, and `$.race`.

## Per-Call Hooks

Agent per-call hooks are set on `AgentOverrides` (the second parameter to `.generate()` or `.stream()`). They have the same names as the base hooks but fire **after** the base hooks.

```ts
await myAgent.generate("hello", {
  onStart: ({ input }) => console.log("call-level start"),
  onFinish: ({ result, duration }) => console.log(`call done in ${duration}ms`),
});
```

## Hook Merging

Per-call hooks merge with base hooks -- base fires first, then call-level. Both are independently wrapped with `attemptEachAsync`, so an error in one hook does not prevent the other from running.

For workflow engines created with `createWorkflowEngine()`, engine-level hooks fire first, then workflow-level hooks fire second.

## Hook Execution Order

For a `$.agent` call inside a workflow:

```
step.onStart -> workflow.onStepStart -> execute -> step.onFinish -> workflow.onStepFinish
```

On error, the sequence diverges:

```
step.onStart -> workflow.onStepStart -> execute (throws) -> step.onError -> workflow.onStepFinish
```

For an agent's tool-loop steps:

```
base.onStepFinish -> overrides.onStepFinish
```

The `stepId` for agent tool-loop steps is counter-based: `agentName:0`, `agentName:1`, etc.

## Error Handling

All hooks are executed via `attemptEachAsync`, which:

1. Runs each hook sequentially.
2. Catches and swallows any errors -- hook failures never propagate.
3. Skips `undefined` hooks (no null checks needed at call sites).

This means a failing hook will never mask the original error or prevent other hooks from running.

## References

- [Agent](agent.md)
- [Workflow](workflow.md)
- [Step Builder ($)](step.md)
