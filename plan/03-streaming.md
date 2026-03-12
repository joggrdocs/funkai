# 03 — Streaming Architecture

## Problem

A regular `agent.stream()` returns a `ReadableStream<string>` that emits
text chunks as the LLM generates them. A flow agent has no single LLM —
it runs code that orchestrates multiple agents and steps. What goes in
the stream?

## Design: Steps stream as tool-call events

The stream from `flowAgent.stream()` emits the same event types that
the Vercel AI SDK emits for tool calls. This means consumers (especially
UI components) that already handle tool-call streaming events get step
rendering for free.

### StreamResult — identical to Agent

```typescript
import type { AsyncIterableStream, TextStreamPart, ToolSet } from 'ai'

type StreamPart = TextStreamPart<ToolSet>

interface StreamResult<TOutput> {
  output: Promise<TOutput>
  messages: Promise<Message[]>
  usage: Promise<TokenUsage>
  finishReason: Promise<string>
  fullStream: AsyncIterableStream<StreamPart>
}
```

The `fullStream` field uses the AI SDK's `AsyncIterableStream<StreamPart>`
type directly — a dual interface supporting both `for await...of` and
`.getReader()`. Events are typed discriminated unions (`text-delta`,
`tool-call`, `tool-result`, `finish`, `error`), not serialized strings.

### What the stream emits

For each step, the stream emits tool-call events:

```
[step starts]   → tool-call event (step id, input)
[step finishes] → tool-result event (step id, output)
...repeat for each step...
[flow finishes] → text event (serialized final output)
```

Concretely, emitting typed `StreamPart` objects:

```typescript
// Step start — emitted when $.step/$.agent/$.map/etc begins
writer.write({
  type: 'tool-call',
  toolCallId: 'scan-repo-0',
  toolName: 'scan-repo',
  args: { repo: 'github.com/...' },
} as StreamPart)

// Step finish — emitted when step completes
writer.write({
  type: 'tool-result',
  toolCallId: 'scan-repo-0',
  toolName: 'scan-repo',
  args: { repo: 'github.com/...' },
  result: { files: ['README.md', 'src/index.ts'] },
} as StreamPart)

// Flow finish — emitted at the end
writer.write({
  type: 'finish',
  finishReason: 'stop',
  usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
} as StreamPart)
```

### Sub-agent text streaming

When a step calls `$.agent()` and that agent supports streaming, the
agent's text output is piped through the parent stream as text-delta
events. This means consumers see sub-agent text arriving in real-time
between the tool-call events.

```
tool-call: analyze-1
  text-delta: "The code"
  text-delta: " shows a"
  text-delta: " pattern..."
tool-result: analyze-1 → { summary: "The code shows a pattern..." }
```

This is an opt-in behavior. By default, `$.agent()` uses `.generate()`
internally (no streaming). To stream sub-agent text, the step builder
needs an explicit streaming mode:

```typescript
// Default: no text streaming from sub-agents
const r = await $.agent({ id: 'analyze', agent: analyzer, input: data })

// Opt-in: stream sub-agent text through parent stream
const r = await $.agent({ id: 'analyze', agent: analyzer, input: data, stream: true })
```

When `stream: true`, the step builder calls `agent.stream()` instead of
`agent.generate()` and pipes the text chunks through the parent's stream
writer. The result is still the same `StepResult<GenerateResult>`.

### Implementation sketch

```typescript
async function stream(
  input: TInput,
  overrides?: FlowAgentOverrides
): Promise<Result<StreamResult<TOutput>>> {
  // Validate input
  const parsed = config.input.safeParse(input)
  if (!parsed.success) return err(...)

  const startedAt = Date.now()
  const { readable, writable } = new TransformStream<StreamPart, StreamPart>()
  const writer = writable.getWriter()
  const messages: Message[] = []
  const trace: TraceEntry[] = []

  // Create context with message collector + stream writer
  const ctx: FlowContext = {
    signal: overrides?.signal ?? new AbortController().signal,
    log: resolveLogger(...),
    trace,
    messages,
    writer,   // step builder uses this to emit typed StreamPart events
  }

  const $ = createStepBuilder({ ctx, ... })

  // Run handler in background, piping results through stream
  const done = (async () => {
    try {
      const output = await handler({ input, $, log: ctx.log })

      // Validate output
      const outputParsed = config.output.safeParse(output)
      if (!outputParsed.success) throw new Error(...)

      const duration = Date.now() - startedAt
      const usage = sumTokenUsage(collectUsages(trace))

      // Emit typed finish event
      await writer.write({ type: 'finish', finishReason: 'stop', usage } as StreamPart)
      await writer.close()

      // Add final assistant message
      messages.push({ role: 'assistant', content: JSON.stringify(output) })

      return { output, messages: [...messages], usage, finishReason: 'stop' as const }
    } catch (thrown) {
      const error = toError(thrown)
      await writer.write({ type: 'error', error } as StreamPart)
      await writer.close()
      throw error
    }
  })()

  return {
    ok: true,
    output: done.then(r => r.output),
    messages: done.then(r => r.messages),
    usage: done.then(r => r.usage),
    finishReason: done.then(r => r.finishReason),
    fullStream: readable as AsyncIterableStream<StreamPart>,
  }
}
```

### Concurrent steps in stream

When steps run concurrently (via `$.map`, `$.all`, `$.race`), their
tool-call events interleave in the stream in the order they start/finish.
Each event carries the step's `toolCallId` so consumers can correlate
starts with finishes:

```
tool-call: write-doc-0     (map item 0 starts)
tool-call: write-doc-1     (map item 1 starts)
tool-call: write-doc-2     (map item 2 starts)
tool-result: write-doc-1   (map item 1 finishes first)
tool-result: write-doc-0   (map item 0 finishes second)
tool-result: write-doc-2   (map item 2 finishes last)
```

This is natural — it mirrors how a real agent's tool calls would appear
if the model issued multiple parallel tool calls.

---

## Comparison with current workflow streaming

### Before (workflow)

```typescript
const result = await w.stream({ text: '...' })
// result.stream is ReadableStream<StepEvent>
// StepEvent = { type: 'step:start' | 'step:finish' | 'step:error' | 'workflow:finish', ... }
// Custom event format — consumers need custom rendering
```

### After (flowAgent)

```typescript
const result = await analyze.stream({ text: '...' })
// result.fullStream is AsyncIterableStream<StreamPart> (typed events)
// Emits AI SDK tool-call, tool-result, text-delta, finish, error events
// Standard UI components render steps as tool calls automatically
// result.messages resolves to full message array with synthetic tool calls
```

---

## Edge cases

### Steps with no meaningful output

Some steps (like `$.each()`) return `void`. These still emit tool-call
events but with `result: null` in the tool-result message.

### Error steps

If a step fails, the tool-result contains the error:

```typescript
{
  role: 'tool',
  content: [{
    type: 'tool-result',
    toolCallId: 'fetch-data-0',
    toolName: 'fetch-data',
    result: { error: 'Connection refused' },
    isError: true,
  }]
}
```

### Flow agent as sub-agent

When a flow agent is used as a sub-agent (via `agents: { myFlow }` in
another agent's config), it gets wrapped as a tool like any other agent.
The parent agent sees a single tool-call/result pair. The flow agent's
internal step messages are NOT propagated to the parent's message array.

### Empty flows

If the handler returns immediately without any `$` calls, the message
array contains just the user input and the final assistant output.
No tool-call messages.
