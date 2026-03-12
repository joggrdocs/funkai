# Research: `prepareStep` and `activeTools` Support

> **Date**: 2026-03-06
> **AI SDK Version**: `^6.0.111`
> **Status**: Gap identified — neither `prepareStep` nor `activeTools` are wired through the SDK

## Summary

The Vercel AI SDK v6 provides two key parameters for controlling the agentic tool-calling loop: `prepareStep` (a callback that fires **before** each step) and `activeTools` (restricts which tools are available). Our agent SDK does not expose or forward either of these to `generateText`/`streamText`.

## What the AI SDK v6 Provides

### `prepareStep`

An async callback passed to `generateText`/`streamText` that fires before each step in the tool-calling loop.

**Input (`PrepareStepOptions`):**

| Field                  | Type                  | Description                                                              |
| ---------------------- | --------------------- | ------------------------------------------------------------------------ |
| `steps`                | `StepResult<TOOLS>[]` | All previously executed steps with results, tool calls, and usage        |
| `stepNumber`           | `number`              | Current step index (0-based)                                             |
| `model`                | `LanguageModel`       | The current model                                                        |
| `messages`             | `ModelMessage[]`      | Messages about to be sent to the model                                   |
| `experimental_context` | `unknown`             | User-defined context (see [context research](./experimental-context.md)) |

**Output (`PrepareStepResult<TOOLS>`):**

| Field                  | Type                        | Description                            |
| ---------------------- | --------------------------- | -------------------------------------- |
| `model`                | `LanguageModel` (optional)  | Override model for this step           |
| `messages`             | `ModelMessage[]` (optional) | Override/transform messages            |
| `activeTools`          | `string[]` (optional)       | Restrict available tools for this step |
| `toolChoice`           | `ToolChoice` (optional)     | Force a specific tool or `"required"`  |
| `system`               | `string` (optional)         | Override system prompt                 |
| `experimental_context` | `unknown` (optional)        | Modify context for subsequent steps    |
| `providerOptions`      | `Record` (optional)         | Provider-specific settings             |

### `activeTools`

An array of tool name strings that restricts which tools the model can invoke. Available both at the top-level `generateText` call (static restriction) and inside `prepareStep` (dynamic per-step restriction). Does not change the tool call/result types — only limits availability.

## Current SDK State

### `agent.ts` — `generateText` call (lines 237-263)

```typescript
const aiResult = await generateText({
  model,
  system,
  ...promptParams,
  tools: aiTools,
  output,
  stopWhen: stepCountIs(maxSteps),
  abortSignal: overrideSignal,
  onStepFinish: async (step) => {
    /* observability only */
  },
})
```

No `prepareStep` or `activeTools` parameters are passed.

### `AgentConfig` — missing fields

The `AgentConfig` interface (`types.ts`) defines hooks for `onStart`, `onFinish`, `onError`, and `onStepFinish`. None of these run **before** a step or can modify the next step's configuration.

### `AgentOverrides` — missing fields

The `AgentOverrides` interface has per-call overrides for `model`, `system`, `tools`, `agents`, `maxSteps`, `output`, and hooks. No `prepareStep` or `activeTools`.

## Capabilities Unlocked by Wiring These Through

### Context Window Management

```typescript
prepareStep: async ({ messages, stepNumber }) => {
  // Keep only last N messages when context grows too large
  if (messages.length > 50) {
    return {
      messages: [messages[0], ...messages.slice(-20)],
    }
  }
  return {}
}
```

### Dynamic Tool Activation

```typescript
prepareStep: async ({ stepNumber }) => {
  // Phase 1: research only
  if (stepNumber < 3) {
    return { activeTools: ['search', 'readFile'] }
  }
  // Phase 2: editing
  return { activeTools: ['editFile', 'writeFile'] }
}
```

### Model Switching

```typescript
prepareStep: async ({ steps }) => {
  const lastStep = steps.at(-1)
  // Switch to a more capable model if the task is complex
  if (lastStep?.toolCalls.length > 3) {
    return { model: openrouter('anthropic/claude-sonnet-4') }
  }
  return {}
}
```

### System Prompt Adaptation

```typescript
prepareStep: async ({ steps }) => {
  const completedTools = steps.flatMap((s) => s.toolCalls.map((tc) => tc.toolName))
  if (completedTools.includes('analyzeCode')) {
    return { system: 'You have analyzed the code. Now focus on generating the fix.' }
  }
  return {}
}
```

## Implementation Path

1. Add `prepareStep` and `activeTools` fields to `AgentConfig<TInput, TOutput, TTools, TSubAgents>`
2. Add the same fields to `AgentOverrides<TTools, TSubAgents>`
3. Forward them to the `generateText`/`streamText` calls in `agent.ts`
4. For `prepareStep`, merge base config + per-call override (call-level wraps base-level, or provide a composition utility)

## References

- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [Agents: Loop Control Docs](https://ai-sdk.dev/docs/agents/loop-control)
- [generateText API Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [streamText API Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
