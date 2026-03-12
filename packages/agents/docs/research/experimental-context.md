# Research: `experimental_context` — Per-Call Context Store

> **Date**: 2026-03-06
> **AI SDK Version**: `^6.0.111`
> **Status**: Gap identified — context is not wired through the SDK; tool execute signature drops it

## Summary

The Vercel AI SDK v6 provides `experimental_context` — a user-defined state object that flows through the entire `generateText`/`streamText` lifecycle. It is available in `prepareStep`, tool `execute` callbacks, and lifecycle hooks. Our SDK does not expose it at any layer, and our `tool()` helper actively drops the second argument that carries it.

## How `experimental_context` Flows in the AI SDK

```
generateText({ experimental_context: initialState })
        │
        ▼
   prepareStep({ experimental_context })
        │  can return { experimental_context: modifiedState }
        ▼
   tool.execute(input, { experimental_context })
        │  tools can read it (typed as unknown)
        ▼
   onStepFinish({ experimental_context })
        │  callbacks can observe it
        ▼
   next step's prepareStep receives updated context
        │
        ▼
   result.experimental_context  ←  final state after all steps
```

### Key Behaviors

- **Mutable across steps**: `prepareStep` can return a new `experimental_context`, which propagates to all subsequent steps and tool calls
- **Available in tool execute**: received as `execute(input, { experimental_context })`
- **Typed as `unknown`**: consumers must cast/validate at runtime
- **Experimental**: can break in patch releases (the `experimental_` prefix is the AI SDK's convention for unstable APIs)

### AI SDK Code Example

```typescript
const result = await generateText({
  model: openrouter('anthropic/claude-sonnet-4'),
  tools: {
    fetchData: tool({
      description: 'Fetch data from the API',
      inputSchema: z.object({ endpoint: z.string() }),
      execute: async (input, { experimental_context: ctx }) => {
        const typed = ctx as { authToken: string }
        const res = await fetch(input.endpoint, {
          headers: { Authorization: `Bearer ${typed.authToken}` },
        })
        return res.json()
      },
    }),
  },
  experimental_context: { authToken: 'sk-...' },
  prepareStep: async ({ experimental_context, stepNumber }) => {
    // Evolve context between steps
    const ctx = experimental_context as { authToken: string; stepCount: number }
    return {
      experimental_context: { ...ctx, stepCount: stepNumber },
    }
  },
})
```

## Current SDK State

### `tool.ts` — Execute signature drops context

Our `tool()` helper wraps execute as:

```typescript
// tool.ts:111
execute: async (data: TInput) => config.execute(data),
```

The AI SDK passes a second `options` argument to `execute` containing `{ experimental_context, abortSignal, messages, ... }`. Our wrapper discards this entirely. Tools created with our `tool()` can never access context.

### `ToolConfig` — No context in the type

```typescript
// tool.ts:65
execute: (input: TInput) => Promise<TOutput>
```

The execute signature only accepts `input`. There is no options parameter.

### `AgentConfig` / `AgentOverrides` — No context field

Neither type includes `experimental_context` or any equivalent. The `generateText` call in `agent.ts` does not pass it.

### Comparison: Our `ExecutionContext` vs AI SDK `experimental_context`

| Aspect                         | AI SDK `experimental_context`      | Our `ExecutionContext`                              |
| ------------------------------ | ---------------------------------- | --------------------------------------------------- |
| **Layer**                      | Per-`generateText` call, per-step  | Per-workflow, per-`$` operation                     |
| **Available in tools**         | Yes, via execute's second arg      | No                                                  |
| **Mutable between steps**      | Yes, via `prepareStep`             | No (readonly signal + logger)                       |
| **Available in `prepareStep`** | Yes                                | N/A (no `prepareStep` exposed)                      |
| **User-defined shape**         | Yes (typed as `unknown`)           | No (fixed: signal + logger + trace)                 |
| **Purpose**                    | Ambient state for the agentic loop | Framework plumbing (cancellation, logging, tracing) |

These are complementary, not competing. `ExecutionContext` is framework infrastructure; `experimental_context` is user-space state.

## Implementation Path

### 1. Extend `ToolConfig.execute` to accept context

```typescript
interface ToolConfig<TInput, TOutput> {
  execute: (input: TInput, options?: { context?: unknown }) => Promise<TOutput>
}
```

And forward the AI SDK's second arg:

```typescript
// tool.ts — updated wrapper
execute: async (data: TInput, options) => config.execute(data, {
  context: options?.experimental_context,
}),
```

### 2. Add context to `AgentConfig` and `AgentOverrides`

```typescript
interface AgentConfig<TInput, TOutput, TTools, TSubAgents> {
  // ...existing fields
  context?: unknown
}

interface AgentOverrides<TTools, TSubAgents> {
  // ...existing fields
  context?: unknown
}
```

### 3. Forward to `generateText`

```typescript
const aiResult = await generateText({
  // ...existing params
  experimental_context: overrideContext ?? config.context,
})
```

### 4. Combine with `prepareStep`

Once both `prepareStep` and `experimental_context` are wired, the context becomes fully mutable across the agentic loop — enabling patterns like:

- Accumulating discovered information across steps
- Passing auth tokens or session state to tools
- Tracking which tools have been called and their results
- Sharing state between parent agent and sub-agents-as-tools

## Open Issues

- [GitHub #10482](https://github.com/vercel/ai/issues/10482) — Requests tighter `experimental_context` integration in `prepareStep` (may already be resolved in latest v6)
- The `experimental_` prefix means this API could change. Consider wrapping it behind a stable SDK-level abstraction so consumers are insulated from upstream changes.

## References

- [AI SDK Tool Calling docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [generateText API Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [GitHub Issue #10482](https://github.com/vercel/ai/issues/10482)
