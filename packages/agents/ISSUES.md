# Agent SDK — Issue Log

Tracked issues discovered during code review. Each issue is tagged with severity, category, and acceptance criteria for resolution.

---

<issue id="1" severity="high" category="bug" status="closed">

## #1 — StepResult spread fails for non-object types

**File:** `src/core/workflows/steps/factory.ts:152`
**Related:** `src/core/workflows/steps/result.ts:26-28`

### Description

`executeStep` constructs the success result as:

```typescript
return { ok: true, ...(value as T), step: stepInfo, duration } as StepResult<T>
```

Spreading a primitive (`string`, `number`, `boolean`) produces garbage at runtime. `..."hello"` yields `{0:'h',1:'e',...}`. The `StepResult<T>` type definition (`T & { ok: true; ... }`) is also unsound for primitives since `string & { ok: true }` is effectively `never`.

Any step returning a non-object value (`$.step<string>(...)`, `$.step<number>(...)`) will produce broken results that the type system masks.

### Acceptance Criteria

- [ ] `StepResult<T>` wraps the success value in a named field (e.g. `value: T`) instead of intersecting `T &`
- [ ] OR `T` is constrained to `Record<string, unknown>` to enforce object-only step results
- [ ] Existing tests updated to reflect the new shape
- [ ] A test exists that verifies `$.step<string>(...)` returns the correct value

</issue>

---

<issue id="2" severity="high" category="bug" status="closed">

## #2 — Abort signal not propagated to agents in workflow steps

**File:** `src/core/workflows/steps/factory.ts:182-186`

### Description

When `$.agent()` calls `config.agent.generate(config.input, agentConfig)`, the `agentConfig` merges user config and logger but never includes `ctx.signal`:

```typescript
const agentConfig = {
  ...config.config,
  logger: ctx.log.child({ stepId: config.id }),
  // Missing: signal: ctx.signal
}
```

If the workflow is cancelled via abort signal, agents running inside `$.agent()` steps continue until completion.

### Acceptance Criteria

- [ ] `$.agent()` passes `ctx.signal` to the agent via `agentConfig.signal`
- [ ] User-provided `config.config.signal` takes precedence over `ctx.signal` if explicitly set
- [ ] A test verifies that aborting the workflow signal causes the agent call to receive the signal

</issue>

---

<issue id="3" severity="high" category="bug" status="closed">

## #3 — Agent `stream()` eagerly consumes entire stream

**File:** `src/core/agent/agent.ts:274-303`

### Description

The `stream()` method fully drains `aiResult.textStream` before returning:

```typescript
const chunks: string[] = []
for await (const chunk of aiResult.textStream) {
  chunks.push(chunk)
}
```

Then creates a "replay stream" from collected chunks. The caller cannot consume text incrementally — `stream()` is functionally identical to `generate()` with extra overhead.

### Acceptance Criteria

- [ ] `stream()` returns before the full generation completes
- [ ] The returned stream emits chunks as they arrive from the model
- [ ] `output` and `messages` are resolved after the stream completes (e.g. via promises or post-stream access)
- [ ] Existing `stream()` tests updated to verify incremental delivery

</issue>

---

<issue id="4" severity="medium" category="bug" status="closed">

## #4 — Agent `stream()` ignores structured output

**File:** `src/core/agent/agent.ts:280-282`

### Description

In `stream()`, the output is always set to raw text:

```typescript
const finalText = await aiResult.text
const finalOutput = finalText
```

Compare with `generate()` which correctly branches:

```typescript
output: (output ? aiResult.output : aiResult.text) as TOutput
```

When an agent has structured output (e.g. `Output.object({ schema })`), `stream()` returns a raw string instead of the parsed object. The `TOutput` type assertion masks this at compile time.

### Acceptance Criteria

- [ ] `stream()` checks for structured output the same way `generate()` does
- [ ] When `output` is configured, `stream()` returns the parsed object, not raw text
- [ ] A test exists that verifies `stream()` with structured output returns the correct type

</issue>

---

<issue id="5" severity="medium" category="bug" status="closed">

## #5 — `$.race()` does not cancel losing entries

**File:** `src/core/workflows/steps/factory.ts:331-343`
**Related:** `src/core/workflows/steps/race.ts:5`

### Description

`RaceConfig` docs say "Losers are cancelled via abort signal" but the implementation is just:

```typescript
execute: async () => Promise.race(config.entries),
```

No abort controller is created. No signals are propagated. Losing entries continue running to completion.

### Acceptance Criteria

- [ ] `$.race()` cancels losing entries when the winner resolves
- [ ] OR the docs are updated to remove the cancellation claim and document actual behavior
- [ ] If cancellation is implemented, entries must accept an abort signal (API change to accept factories instead of pre-started promises)

</issue>

---

<issue id="6" severity="medium" category="bug" status="closed">

## #6 — `$.all()` / `$.race()` entries are pre-started promises

**File:** `src/core/workflows/steps/factory.ts:313-329`
**Related:** `src/core/workflows/steps/all.ts`, `src/core/workflows/steps/race.ts`

### Description

`AllConfig.entries` and `RaceConfig.entries` are typed as `Promise<any>[]`. By the time `executeStep` records `startedAt`, those promises are already executing. This means:

1. Trace `startedAt` timestamp is too late (work already began)
2. If entries resolved before `$.all()` is called, hooks fire after the fact
3. `duration` measurement underestimates actual execution time

The `AllConfig` JSDoc acknowledges this ("already tracked individually") but the `executeStep` wrapper's timing is still misleading.

### Acceptance Criteria

- [ ] Entries are changed to factory functions `(() => Promise<T>)[]` so the framework controls start time
- [ ] OR the trace/timing for `$.all()` / `$.race()` is documented as "coordination overhead only, not total execution time"
- [ ] If factories are adopted, update `StepBuilder` types and all call sites

</issue>

---

<issue id="7" severity="medium" category="logic" status="closed">

## #7 — `onStepFinish` never fires on error

**File:** `src/core/workflows/steps/factory.ts:167-168`

### Description

The catch block only fires step-level `onError`. The workflow-level `parentHooks.onStepFinish` is never called for failed steps. This is intentional per the comment, but asymmetric with `onStepStart` (which always fires). There is no `onStepError` hook at the workflow level.

Consumers using `onStepFinish` for telemetry (e.g. recording step durations) will silently miss all failed steps.

### Acceptance Criteria

- [ ] `onStepFinish` fires for both success and error cases (with error info included in the event)
- [ ] OR a new workflow-level `onStepError` hook is added
- [ ] The chosen behavior is documented in the `WorkflowConfig` JSDoc

</issue>

---

<issue id="8" severity="medium" category="logic" status="closed">

## #8 — `finishReason` passed as `stepId` in agent `onStepFinish` hook

**File:** `src/core/agent/agent.ts:144, 265`

### Description

Both `generate()` and `stream()` pass the AI SDK's `event.finishReason` as the `stepId`:

```typescript
onStepFinish: async (event) => {
  config.onStepFinish!({ stepId: event.finishReason })
}
```

`finishReason` is `"stop"`, `"length"`, `"tool-calls"`, etc. — not a step identifier. Consumers expecting a unique step ID will get the finish reason instead.

### Acceptance Criteria

- [ ] Pass a meaningful step identifier (e.g. counter-based ID, or `agentName:stepIndex`)
- [ ] OR rename the hook parameter from `stepId` to `finishReason` to match the actual value
- [ ] Update the `AgentConfig.onStepFinish` type signature accordingly

</issue>

---

<issue id="9" severity="low" category="logic" status="closed">

## #9 — `withModelMiddleware` wraps model even with empty middleware

**File:** `src/lib/middleware.ts:49-52`

### Description

When devtools is disabled (production) and no user middleware is provided, the function still calls `wrapLanguageModel({ model, middleware: [] })`. This creates an unnecessary wrapper layer.

### Acceptance Criteria

- [ ] Return the model directly when middleware array is empty
- [ ] Add a test verifying no wrapping occurs in production with no middleware

</issue>

---

<issue id="10" severity="low" category="logic" status="closed">

## #10 — Middleware ordering contradicts documentation

**File:** `src/lib/middleware.ts:13-14, 45-46`

### Description

JSDoc says "Additional middleware to apply **after** defaults" but the implementation puts user middleware first:

```typescript
;[...options.middleware, ...defaultMiddleware]
```

User middleware is outermost (wraps around devtools), contradicting "after defaults."

### Acceptance Criteria

- [ ] Either swap the order to `[...defaultMiddleware, ...options.middleware]`
- [ ] OR update the JSDoc to say "before defaults" / "outermost"
- [ ] Add a test that verifies middleware execution order

</issue>

---

<issue id="11" severity="low" category="improvement" status="closed">

## #11 — `snapshotTrace` shallow-clones entries

**File:** `src/lib/trace.ts:100`

### Description

`{ ...entry }` only clones the top-level `TraceEntry` fields. `entry.input`, `entry.output`, and `entry.error` are reference copies. Mutations to original objects after snapshot are visible through the "frozen" trace.

### Acceptance Criteria

- [ ] Use `structuredClone` for input/output fields (noting `Error` objects need special handling)
- [ ] OR document that input/output references are shared and only the trace structure is frozen

</issue>

---

<issue id="12" severity="medium" category="improvement" status="closed">

## #12 — No abort signal checking in sequential step loops

**File:** `src/core/workflows/steps/factory.ts:246-298`

### Description

`$.each()` (line 246), `$.reduce()` (line 266), and `$.while()` (line 293) all loop without checking `ctx.signal.aborted`. If a workflow is cancelled mid-loop, these operations continue iterating through all items. `$.while()` is especially vulnerable since it loops on an arbitrary condition.

### Acceptance Criteria

- [ ] Each sequential loop checks `ctx.signal.aborted` at the start of each iteration
- [ ] When aborted, the loop throws an appropriate error (e.g. `AbortError`)
- [ ] A test verifies that aborting mid-loop stops iteration

</issue>

---

<issue id="13" severity="low" category="improvement" status="closed">

## #13 — `poolMap` ignores abort signal

**File:** `src/core/workflows/steps/factory.ts:371-376`

### Description

The `poolMap` worker loop (`while (nextIndex < items.length)`) never checks for abort signal cancellation. Workers continue processing items after the workflow has been aborted.

### Acceptance Criteria

- [ ] `poolMap` accepts the abort signal and checks it before starting each item
- [ ] When aborted, workers exit cleanly

</issue>

---

<issue id="14" severity="low" category="improvement" status="closed">

## #14 — `writer.write()` not awaited in workflow stream

**File:** `src/core/workflows/workflow.ts:470-472`

### Description

The `emit` function calls `writer.write(event)` without awaiting the returned promise. If the readable side is cancelled or the internal queue is full, the rejection is unhandled. Additionally, `emit` is typed as synchronous `(event: StepEvent) => void` but `writer.write` is async.

### Acceptance Criteria

- [ ] Either await the write (and change `emit` to async)
- [ ] OR add `.catch(() => {})` to swallow write errors silently
- [ ] The `emit` type signature matches the actual behavior

</issue>

---

<issue id="15" severity="low" category="improvement" status="closed">

## #15 — `openrouter()` creates a new provider instance on every call

**File:** `src/core/provider/provider.ts:47-51`

### Description

Every call to `openrouter(modelId)` creates a new `OpenRouterProvider` instance. If the provider maintains internal state, caching, or connection pooling, this is wasteful.

### Acceptance Criteria

- [ ] Cache the provider instance lazily at module scope
- [ ] Invalidation strategy if `OPENROUTER_API_KEY` changes at runtime (or document that it doesn't)

</issue>

---

<issue id="16" severity="low" category="improvement" status="closed">

## #16 — `createTool` adds unnecessary async wrapper around execute

**File:** `src/core/tool.ts:109`

### Description

`execute: async (data: TInput) => config.execute(data)` wraps the user's execute function in an extra async layer, adding one unnecessary microtask per tool call. The wrapper exists so `assertTool` can validate the intermediate object, but `config.execute` could be passed directly.

### Acceptance Criteria

- [ ] Pass `config.execute` directly instead of wrapping
- [ ] OR document why the wrapper is intentional (if there's a reason beyond assertion)

</issue>

---

<issue id="17" severity="medium" category="improvement" status="closed">

## #17 — Subagent tool calls do not propagate abort signal

**File:** `src/core/agent/utils.ts:54-74`

### Description

When a subagent is wrapped as a tool via `buildAITools`, the `execute` function calls `runnable.generate(input)` without passing an abort signal. The AI SDK passes `{ abortSignal }` as the second parameter to tool execute functions, but this code ignores it. If the parent agent is cancelled, subagent tool calls continue running.

### Acceptance Criteria

- [ ] Accept the `abortSignal` from the AI SDK tool execution context
- [ ] Forward it as `{ signal: abortSignal }` to `runnable.generate()`
- [ ] A test verifies signal propagation from parent to subagent

</issue>

---

<issue id="18" severity="low" category="improvement" status="closed">

## #18 — No runtime guard for `input` schema without `prompt` function

**File:** `src/core/agent/utils.ts:107`

### Description

If a user provides `input` schema but omits `prompt` (or vice versa), the code silently falls through to simple mode. Both fields are independently optional in `AgentConfig` — no type-level or runtime enforcement that they must be provided together.

### Acceptance Criteria

- [ ] Add a runtime warning or error when `input` is provided without `prompt` (and vice versa)
- [ ] OR use a discriminated union at the type level to enforce the constraint
- [ ] A test verifies the guard triggers correctly

</issue>

---

<issue id="19" severity="low" category="improvement" status="closed">

## #19 — `LanguageModel` type narrowed to `specificationVersion: 'v3'` only

**File:** `src/core/provider/types.ts:11`

### Description

```typescript
export type LanguageModel = Extract<BaseLanguageModel, { specificationVersion: 'v3' }>
```

This rejects models using future spec versions (v4, etc.). When the AI SDK introduces a new version, models using it won't be assignable. Forward-incompatible.

### Acceptance Criteria

- [ ] Use the base `LanguageModel` type directly
- [ ] OR use a union that accommodates known + future versions
- [ ] OR document this as intentional pinning with a note to update on AI SDK major bumps

</issue>

---

<issue id="20" severity="low" category="improvement" status="closed">

## #20 — Duck-typing for `OutputSpec` detection is fragile

**File:** `src/core/agent/output.ts:37-40`

### Description

`resolveOutput` checks `'parseCompleteOutput' in output` to distinguish an `OutputSpec` from a Zod schema. If the AI SDK renames that method, or a Zod schema happens to have a property named `parseCompleteOutput`, detection breaks silently.

### Acceptance Criteria

- [ ] Use a more robust discriminant (e.g. `instanceof`, brand checking, or a symbol)
- [ ] OR document the fragility and add a test that catches regressions on AI SDK upgrades

</issue>

---

<issue id="21" severity="medium" category="logic" status="closed">

## #21 — Zod array element extraction uses private `_zod` internals

**File:** `src/core/agent/output.ts:43-50`

### Description

The code accesses `(output as unknown as Record<string, unknown>)._zod` to extract the element schema from a Zod array. This relies on Zod's internal `_zod` property which can change across versions. If the structure changes, array output detection silently falls back to `Output.object({ schema: output })`, producing incorrect parsing.

### Acceptance Criteria

- [ ] Use Zod's public API for array element introspection
- [ ] A test verifies correct array element extraction across the supported Zod version
- [ ] Add a regression test that catches breakage if Zod internals change

</issue>

---

<issue id="22" severity="low" category="improvement" status="closed">

## #22 — Orphaned AbortController in workflow `generate()`

**File:** `src/core/workflows/workflow.ts:368`

### Description

```typescript
const signal = overrides?.signal ?? new AbortController().signal
```

When no signal is provided, a new `AbortController` is created but its reference is immediately discarded. The signal can never fire. Harmless but wasteful.

### Acceptance Criteria

- [ ] Only create an AbortController when needed, or pass `undefined` and check `signal?.aborted` in loops
- [ ] OR keep the current behavior and document it as intentional (a never-firing signal simplifies downstream code that always expects a signal)

</issue>

---

<issue id="23" severity="low" category="improvement" status="closed">

## #23 — O(N^2) array copying in `attemptEachAsync`

**File:** `src/utils/attempt.ts:34-36`

### Description

```typescript
;async (acc, h) => [...(await acc), await attemptAsync<T, E>(async () => h())]
```

Each reduce iteration creates a new array via spread. For N handlers, this is O(N^2) element copies. N is typically 1-2 so the impact is negligible, but the pattern is unnecessarily wasteful.

### Acceptance Criteria

- [ ] Replace `reduce` with a simple `for` loop using `push`
- [ ] Behavior and return type remain identical

</issue>
