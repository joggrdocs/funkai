import type { AsyncIterableStream, ModelMessage, TextStreamPart, ToolSet } from "ai";

import type { LanguageModel } from "@/core/provider/types.js";
import type { OperationType } from "@/lib/trace.js";
import type { Result } from "@/utils/result.js";

/**
 * A model reference — an AI SDK `LanguageModel` instance.
 *
 * Use any AI SDK provider function to create one, or wrap with
 * middleware via `wrapLanguageModel()`.
 *
 * @example
 * ```typescript
 * // AI SDK provider instance
 * import { openai } from '@ai-sdk/openai'
 * const myAgent = agent({
 *   name: 'my-agent',
 *   model: openai('gpt-4.1'),
 *   system: 'You are helpful.',
 * })
 *
 * // Middleware-wrapped model
 * import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'
 * import { anthropic } from '@ai-sdk/anthropic'
 * const reasoner = agent({
 *   name: 'reasoner',
 *   model: wrapLanguageModel({
 *     model: anthropic('claude-sonnet-4-5-20250929'),
 *     middleware: extractReasoningMiddleware({ tagName: 'think' }),
 *   }),
 *   system: 'Think step by step.',
 * })
 * ```
 */
export type Model = LanguageModel;

/**
 * Concrete stream event type re-exported from the Vercel AI SDK.
 *
 * This is `TextStreamPart<ToolSet>` — the discriminated union of all
 * possible stream events (`text-delta`, `tool-call`, `tool-result`,
 * `finish`, `error`, etc.). Use `part.type` to discriminate.
 */
export type StreamPart = TextStreamPart<ToolSet>;

/**
 * Information about a step in execution.
 *
 * Passed to step-level hooks (`onStepStart`, `onStepFinish`)
 * and included in step events. Used by both flow agent orchestration
 * steps and agent tool-loop steps.
 */
export interface StepInfo {
  /**
   * The step identifier.
   *
   * For flow agents, matches the `id` field on the step config.
   * For agents, auto-generated as `agentName:stepIndex`.
   */
  id: string;

  /**
   * Auto-incrementing index within the execution.
   *
   * Starts at `0` for the first step and increments for each
   * subsequent tracked operation.
   */
  index: number;

  /**
   * What kind of operation produced this step.
   *
   * Discriminant for filtering or grouping step events.
   */
  type: OperationType;
}

/**
 * Unified event emitted when a step completes.
 *
 * Used by both agents (tool-loop steps) and flow agents (orchestration
 * steps). Agent steps populate the tool-loop fields (`stepId`, `toolCalls`,
 * `toolResults`, `usage`); flow steps populate the orchestration fields
 * (`step`, `result`, `duration`). Fields not relevant to the step type
 * are `undefined`.
 */
export interface StepFinishEvent {
  /**
   * Agent tool-loop step ID (e.g. `"myAgent:0"`).
   *
   * Present on agent tool-loop steps. `undefined` on flow steps.
   */
  stepId?: string;

  /**
   * Tool calls made in this step.
   *
   * Present on agent tool-loop steps. `undefined` on flow steps.
   */
  toolCalls?: readonly { toolName: string; argsTextLength: number }[];

  /**
   * Tool results returned in this step.
   *
   * Present on agent tool-loop steps. `undefined` on flow steps.
   */
  toolResults?: readonly { toolName: string; resultTextLength: number }[];

  /**
   * Token usage for this step.
   *
   * Present on agent tool-loop steps. `undefined` on flow steps.
   */
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };

  /**
   * Flow step info (id, index, type).
   *
   * Present on flow orchestration steps. `undefined` on agent steps.
   */
  step?: StepInfo;

  /**
   * Flow step result value.
   *
   * Present on flow orchestration steps. `undefined` on agent steps.
   */
  result?: unknown;

  /**
   * Flow step duration in milliseconds.
   *
   * Present on flow orchestration steps. `undefined` on agent steps.
   */
  duration?: number;
}

/**
 * A value that can be generated against — the shared contract
 * between Agent and FlowAgent.
 *
 * Both `Agent` and `FlowAgent` satisfy this interface. Any API that
 * accepts a `Runnable` works with either.
 */
export interface Runnable<TInput = unknown, TOutput = unknown> {
  generate(params: {
    input?: TInput;
    prompt?: string;
    messages?: ModelMessage[];
  }): Promise<Result<{ output: TOutput }>>;
  stream(params: {
    input?: TInput;
    prompt?: string;
    messages?: ModelMessage[];
  }): Promise<Result<{ output: Promise<TOutput>; fullStream: AsyncIterableStream<StreamPart> }>>;
  fn(): (params: {
    input?: TInput;
    prompt?: string;
    messages?: ModelMessage[];
  }) => Promise<Result<{ output: TOutput }>>;
}
