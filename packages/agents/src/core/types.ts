import type { AsyncIterableStream, ModelMessage, StepResult, TextStreamPart, ToolSet } from "ai";

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
  /**
   * Agent name (matches `config.name`).
   */
  readonly id: string;
}

/**
 * Event emitted when a step starts execution.
 *
 * Passed to `onStepStart` hooks. Used by both flow agent orchestration
 * steps and agent tool-loop steps. All fields from the former `StepInfo`
 * are inlined here.
 */
export interface StepStartEvent {
  /**
   * The step identifier.
   *
   * For flow agents, matches the `id` field on the step config.
   * For agents, auto-generated as `agentName:stepIndex`.
   */
  readonly stepId: string;

  /**
   * What kind of operation produced this step.
   *
   * Discriminant for filtering or grouping step events.
   */
  readonly stepOperation: OperationType;

  /**
   * Agent ancestry chain from root to the agent that owns this step.
   *
   * Each entry identifies one agent in the chain. The first entry is
   * the root agent, the last is the agent that produced this step.
   *
   * @example
   * ```typescript
   * // Step inside a sub-agent called by a flow agent:
   * event.agentChain
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
 * `stepOperation`, `agentChain`).
 *
 * For **flow orchestration steps**, the AI SDK fields are stubbed with
 * sensible defaults (empty arrays, zero usage, etc.) and overridden
 * with the last agent step's values when available (e.g. `$.agent()`).
 * Flow-specific fields (`output`, `duration`) are always present.
 */
export type StepFinishEvent = AIStepResult & {
  /**
   * Step ID — always present.
   *
   * For agent tool-loop steps: e.g. `"myAgent:0"`.
   * For flow steps: matches the `id` from the step config.
   */
  readonly stepId: string;

  /**
   * What kind of operation produced this step.
   *
   * Discriminant for filtering or grouping step events.
   * e.g. `"agent"`, `"step"`, `"map"`, `"each"`, `"reduce"`, etc.
   */
  readonly stepOperation: OperationType;

  /**
   * Flow step output value.
   *
   * Present on flow orchestration steps. `undefined` on agent tool-loop steps.
   */
  readonly output?: unknown;

  /**
   * Flow step duration in milliseconds.
   *
   * Present on flow orchestration steps. `undefined` on agent tool-loop steps.
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
 * Default AI SDK step result values for flow orchestration steps.
 *
 * Used to populate required `AIStepResult` fields when no real
 * AI SDK step is available (e.g. `$.step()`, `$.map()`, `$.each()`).
 */
const EMPTY_AI_STEP: AIStepResult = {
  stepNumber: 0,
  model: { provider: "", modelId: "" },
  functionId: undefined,
  metadata: undefined,
  experimental_context: undefined,
  content: [],
  text: "",
  reasoning: [],
  reasoningText: undefined,
  files: [],
  sources: [],
  toolCalls: [],
  staticToolCalls: [],
  dynamicToolCalls: [],
  toolResults: [],
  staticToolResults: [],
  dynamicToolResults: [],
  finishReason: "stop",
  rawFinishReason: undefined,
  usage: {
    inputTokens: undefined,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens: undefined,
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
    totalTokens: undefined,
  },
  warnings: undefined,
  request: {},
  response: { id: "", timestamp: new Date(0), modelId: "", messages: [] },
  providerMetadata: undefined,
};

/**
 * Build a `StepFinishEvent` from an AI SDK step result.
 *
 * Used by the agent tool-loop — spreads the full `StepResult` and
 * adds funkai-specific fields.
 *
 * @param step - The AI SDK step result.
 * @param extras - funkai-specific fields (`stepId`, `stepOperation`, `agentChain`).
 * @returns A fully populated `StepFinishEvent`.
 */
export function createAgentStepFinishEvent(
  step: AIStepResult,
  extras: Pick<StepFinishEvent, "stepId" | "stepOperation" | "agentChain">,
): StepFinishEvent {
  return {
    ...step,
    ...extras,
  };
}

/**
 * Build a `StepFinishEvent` for a flow orchestration step.
 *
 * Stubs all AI SDK fields with sensible defaults, then overlays
 * any real AI SDK values from `extras` (e.g. from the last agent step).
 *
 * @param fields - Flow-specific fields (`stepId`, `stepOperation`, `agentChain`, `output`, `duration`).
 * @param extras - Optional AI SDK step result fields to overlay on the defaults.
 * @returns A `StepFinishEvent` with all AI SDK fields populated.
 */
export function createFlowStepFinishEvent(
  fields: Pick<StepFinishEvent, "stepId" | "stepOperation" | "agentChain"> & {
    readonly output?: unknown;
    readonly duration?: number;
  },
  extras?: Partial<AIStepResult>,
): StepFinishEvent {
  return {
    ...EMPTY_AI_STEP,
    ...fields,
    ...extras,
  };
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
