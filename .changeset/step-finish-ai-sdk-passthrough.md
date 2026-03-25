---
"@funkai/agents": major
---

Pass through full AI SDK `StepResult` fields in `onStepFinish` events instead of stripping tool calls/results to summary fields. `StepFinishEvent` is now a superset of the Vercel AI SDK's `StepResult<ToolSet>` — all SDK fields (`text`, `toolCalls`, `toolResults`, `finishReason`, `usage`, `reasoning`, `sources`, `response`, etc.) are passed through unchanged, plus funkai-specific additions (`stepId`, `agentChain`).

**Breaking:** `toolCalls` entries now contain full AI SDK `TypedToolCall` objects (with `input`) instead of `{ toolName, argsTextLength }`. `toolResults` entries now contain full `TypedToolResult` objects (with `output`) instead of `{ toolName, resultTextLength }`. `usage` is now the AI SDK's `LanguageModelUsage` type (with `undefined`-able fields) instead of a simplified `{ inputTokens: number; outputTokens: number; totalTokens: number }`.
