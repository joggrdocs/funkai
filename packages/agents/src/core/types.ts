import type {
  AsyncIterableStream,
  ModelMessage,
  StepResult,
  TextStreamPart,
  ToolSet,
} from "ai";

import type { LanguageModel } from "@/core/provider/types.js";
import type { OperationType } from "@/lib/trace.js";
import type { Result } from "@/utils/result.js";

/**
 * The AI SDK's step result type, unparameterized (uses `ToolSet`).
 *
 * Re-exported so consumers can reference the base shape without
 * importing `ai` directly.
 */
export type AIStepResult = StepResult<ToolSet>;

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
 * An entry in the agent chain — identifies one agent in the
 * ancestry from root to current.
 *
 * Uses an object (not a bare string) so additional fields can be
 * added later without breaking consumers.
 *
 * @example
 * ```typescript
 * // Root flow → sub-agent → sub-sub-agent
 * const chain: AgentChainEntry[] = [
 *   { id: 'pipeline' },
 *   { id: 'researcher' },
 *   { id: 'search' },
 * ]
 * ```
 */
export interface AgentChainEntry {
  /** Agent name (matches `config.name`). */
  readonly id: string;
}

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
  readonly id: string;

  /**
   * Auto-incrementing index within the execution.
   *
   * Starts at `0` for the first step and increments for each
   * subsequent tracked operation.
   */
  readonly index: number;

  /**
   * What kind of operation produced this step.
   *
   * Discriminant for filtering or grouping step events.
   */
  readonly type: OperationType;

  /**
   * Agent ancestry chain from root to the agent that owns this step.
   *
   * Each entry identifies one agent in the chain. The first entry is
   * the root agent, the last is the agent that produced this step.
   *
   * @example
   * ```typescript
   * // Step inside a sub-agent called by a flow agent:
   * event.step.agentChain
   * // → [{ id: 'pipeline' }, { id: 'writer' }]
   * ```
   */
  readonly agentChain?: readonly AgentChainEntry[] | undefined;
}

/**
 * Unified event emitted when a step completes.
 *
 * For **agent tool-loop steps**, this is a full superset of the Vercel
 * AI SDK's `StepResult<ToolSet>` — every field from the SDK is passed
 * through unchanged, plus funkai-specific additions (`stepId`,
 * `agentChain`).
 *
 * For **flow orchestration steps**, the AI SDK fields are absent
 * (they are LLM-specific) and the flow fields (`step`, `result`,
 * `duration`) are populated instead.
 *
 * Fields not relevant to the step type are `undefined`.
 */
export type StepFinishEvent = Partial<AIStepResult> & {
  /**
   * Agent tool-loop step ID (e.g. `"myAgent:0"`).
   *
   * Present on agent tool-loop steps. `undefined` on flow steps.
   */
  readonly stepId?: string;

  /**
   * Flow step info (id, index, type).
   *
   * Present on flow orchestration steps. `undefined` on agent steps.
   */
  readonly step?: StepInfo;

  /**
   * Flow step result value.
   *
   * Present on flow orchestration steps. `undefined` on agent steps.
   */
  readonly result?: unknown;

  /**
   * Flow step duration in milliseconds.
   *
   * Present on flow orchestration steps. `undefined` on agent steps.
   */
  readonly duration?: number;

  /**
   * Agent ancestry chain from root to the agent that produced this event.
   *
   * Each entry identifies one agent in the chain. The first entry is
   * the root agent, the last is the agent that produced this step.
   *
   * Present on both agent tool-loop steps and flow orchestration steps.
   * For direct top-level executions, the chain contains the current
   * agent as a single entry.
   */
  readonly agentChain?: readonly AgentChainEntry[] | undefined;
};

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
