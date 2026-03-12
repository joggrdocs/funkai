import type { Message } from '@/core/agents/base/types.js'

/**
 * Build the `toolCallId` for a step.
 *
 * Combines the step id with the global step index to produce a unique
 * identifier that correlates tool-call and tool-result messages.
 *
 * @param stepId - The step's user-provided id.
 * @param index - The step's global index within the flow.
 * @returns A unique tool call identifier.
 */
export function buildToolCallId(stepId: string, index: number): string {
  return `${stepId}-${index}`
}

/**
 * Create an assistant message containing a synthetic tool-call part.
 *
 * Emitted when a `$` step starts execution. The `args` field captures
 * the step's input snapshot (or `{}` when no input is available).
 *
 * @param toolCallId - Unique tool call identifier.
 * @param toolName - The step id used as the tool name.
 * @param args - The step's input snapshot.
 * @returns A `Message` with role `assistant` and a `tool-call` content part.
 */
export function createToolCallMessage(
  toolCallId: string,
  toolName: string,
  args: unknown
): Message {
  return {
    role: 'assistant',
    content: [
      {
        type: 'tool-call',
        toolCallId,
        toolName,
        args: args ?? {},
      },
    ],
  }
}

/**
 * Create a tool message containing a synthetic tool-result part.
 *
 * Emitted when a `$` step finishes execution. The `result` field captures
 * the step's output. When `isError` is true, the result represents an
 * error message.
 *
 * @param toolCallId - Unique tool call identifier (must match the paired tool-call).
 * @param toolName - The step id used as the tool name.
 * @param result - The step's output snapshot.
 * @param isError - Whether this result represents an error.
 * @returns A `Message` with role `tool` and a `tool-result` content part.
 */
export function createToolResultMessage(
  toolCallId: string,
  toolName: string,
  result: unknown,
  isError?: boolean
): Message {
  const toolResult: Record<string, unknown> = {
    type: 'tool-result',
    toolCallId,
    toolName,
    result: result ?? null,
  }
  if (isError) {
    toolResult.isError = true
  }
  return {
    role: 'tool',
    content: [toolResult],
  }
}

/**
 * Create a user message from flow agent input.
 *
 * This is the first message in the flow's message array, representing
 * the input passed to `flowAgent.generate()` or `flowAgent.stream()`.
 *
 * @param input - The flow agent input.
 * @returns A `Message` with role `user`.
 */
export function createUserMessage(input: unknown): Message {
  const content = typeof input === 'string' ? input : JSON.stringify(input)
  return { role: 'user', content }
}

/**
 * Create a final assistant message from flow agent output.
 *
 * This is the last message in the flow's message array, representing
 * the validated output returned by the handler.
 *
 * @param output - The flow agent output.
 * @returns A `Message` with role `assistant`.
 */
export function createAssistantMessage(output: unknown): Message {
  const content = typeof output === 'string' ? output : JSON.stringify(output)
  return { role: 'assistant', content }
}

/**
 * Serialize a tool-call event for the data stream.
 *
 * @param toolCallId - Unique tool call identifier.
 * @param toolName - The step id used as the tool name.
 * @param args - The step's input snapshot.
 * @returns A JSON string representing the tool-call event.
 */
export function formatToolCallEvent(
  toolCallId: string,
  toolName: string,
  args: unknown
): string {
  return JSON.stringify({
    type: 'tool-call',
    toolCallId,
    toolName,
    args: args ?? {},
  })
}

/**
 * Serialize a tool-result event for the data stream.
 *
 * @param toolCallId - Unique tool call identifier.
 * @param toolName - The step id used as the tool name.
 * @param result - The step's output snapshot.
 * @param isError - Whether this result represents an error.
 * @returns A JSON string representing the tool-result event.
 */
export function formatToolResultEvent(
  toolCallId: string,
  toolName: string,
  result: unknown,
  isError?: boolean
): string {
  const event: Record<string, unknown> = {
    type: 'tool-result',
    toolCallId,
    toolName,
    result: result ?? null,
  }
  if (isError) {
    event.isError = true
  }
  return JSON.stringify(event)
}
