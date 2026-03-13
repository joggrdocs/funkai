import type { ModelResolver } from "@funkai/models";
import type { AsyncIterableStream, ModelMessage, TextStreamPart, ToolSet } from "ai";
import type { ZodType } from "zod";

import type { OutputParam } from "@/core/agents/base/output.js";
import type { Logger } from "@/core/logger.js";
import type { TokenUsage } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type { Model } from "@/core/types.js";
import type { Result } from "@/utils/result.js";

/**
 * Concrete stream event type re-exported from the Vercel AI SDK.
 *
 * This is `TextStreamPart<ToolSet>` — the discriminated union of all
 * possible stream events (`text-delta`, `tool-call`, `tool-result`,
 * `finish`, `error`, etc.). Use `part.type` to discriminate.
 */
export type StreamPart = TextStreamPart<ToolSet>;

/**
 * Record of named subagents available for delegation.
 *
 * Each entry maps a subagent name to an {@link Agent} instance. When
 * passed to an agent's `agents` config, each subagent is automatically
 * wrapped as a callable tool that the parent can invoke during its
 * tool loop. Abort signals propagate from parent to child.
 *
 * @example
 * ```typescript
 * import { agent } from '@funkai/agents'
 * import type { SubAgents } from '@funkai/agents'
 *
 * const researcher = agent({
 *   name: 'researcher',
 *   model: 'openai/gpt-4.1',
 *   system: 'You research topics and return factual summaries.',
 * })
 *
 * const summarizer = agent({
 *   name: 'summarizer',
 *   model: 'openai/gpt-4.1-mini',
 *   system: 'You condense text into concise bullet points.',
 * })
 *
 * const orchestrator = agent({
 *   name: 'orchestrator',
 *   model: 'openai/gpt-4.1',
 *   system: 'Coordinate research and summarization.',
 *   agents: { researcher, summarizer } satisfies SubAgents,
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubAgents = Record<string, Agent<any, any, any, any>>;

/**
 * Chat message type.
 *
 * Re-exported from the Vercel AI SDK (`ModelMessage`). Used for
 * multi-turn conversations, message arrays, and tool-call history.
 */
export type Message = ModelMessage;

/**
 * Result of a completed agent generation.
 *
 * Mirrors the AI SDK's `GenerateTextResult`. The `output` field is
 * typed based on the agent's configured Output variant.
 *
 * @typeParam TOutput - The output type.
 *   - `string` for `Output.text()` (the default).
 *   - `T` for `Output.object({ schema })`.
 *   - `T[]` for `Output.array({ element })`.
 *   - `T` for `Output.choice({ options })`.
 */
export interface GenerateResult<TOutput = string> {
  /**
   * The generation output.
   *
   * Type depends on the configured `Output` variant:
   * - `string` when using `Output.text()` (default).
   * - `T` when using `Output.object<T>({ schema })`.
   * - `T[]` when using `Output.array<T>({ element })`.
   * - One of the option strings when using `Output.choice()`.
   */
  output: TOutput;

  /**
   * Full message history including tool calls.
   *
   * Contains the complete conversation from the generation,
   * including system messages, user prompts, assistant responses,
   * and tool call/result pairs.
   */
  messages: Message[];

  /**
   * Aggregated token usage across all tool-loop steps.
   *
   * Includes input, output, cache, and reasoning token counts.
   * All fields are resolved numbers (0 when the provider does not
   * report a given field).
   */
  usage: TokenUsage;

  /**
   * The reason the model stopped generating.
   *
   * Common values: `"stop"`, `"length"`, `"content-filter"`,
   * `"tool-calls"`, `"error"`, `"other"`.
   */
  finishReason: string;
}

/**
 * Result of a streaming agent generation.
 *
 * The `fullStream` emits typed `StreamPart` events as they arrive —
 * text deltas, tool calls, tool results, step boundaries, finish,
 * and errors. Implements both `AsyncIterable` and `ReadableStream`
 * so consumers can use `for await...of` or `.getReader()`.
 *
 * `output` and `messages` are promises that resolve once the stream
 * has been fully consumed.
 *
 * @typeParam TOutput - The output type (available after stream completes).
 */
export interface StreamResult<TOutput = string> {
  /**
   * The generation output.
   *
   * Resolves after the stream completes. Same typing rules as
   * `GenerateResult.output`.
   */
  output: Promise<TOutput>;

  /**
   * Full message history.
   *
   * Resolves after the stream completes. Contains the complete
   * conversation including tool calls.
   */
  messages: Promise<Message[]>;

  /**
   * Aggregated token usage across all tool-loop steps.
   *
   * Resolves after the stream completes. Includes input, output,
   * cache, and reasoning token counts.
   */
  usage: Promise<TokenUsage>;

  /**
   * The reason the model stopped generating.
   *
   * Resolves after the stream completes. Common values: `"stop"`,
   * `"length"`, `"content-filter"`, `"tool-calls"`, `"error"`, `"other"`.
   */
  finishReason: Promise<string>;

  /**
   * The full stream of typed events.
   *
   * Emits `StreamPart` events (a discriminated union from the AI SDK)
   * including `text-delta`, `tool-call`, `tool-result`, `finish`,
   * `error`, and more. Use `part.type` to discriminate.
   *
   * Supports both `for await (const part of fullStream)` and
   * `fullStream.getReader()`.
   */
  fullStream: AsyncIterableStream<StreamPart>;
}

/**
 * Per-call overrides for agent generation.
 *
 * Passed as the optional second parameter to `.generate()` or `.stream()`.
 * Override fields replace the base config for that call only. Per-call
 * hooks **merge** with base hooks — base fires first, then call-level.
 *
 * @typeParam TTools - The agent's tool record type.
 * @typeParam TSubAgents - The agent's subagent record type.
 */
export interface AgentOverrides<
  TTools extends Record<string, Tool> = Record<string, Tool>,
  TSubAgents extends SubAgents = Record<string, never>,
> {
  /**
   * Override the logger for this call.
   *
   * When an agent runs inside a workflow step (`$.agent()`), the
   * framework passes the step's scoped logger so agent logs include
   * workflow and step context bindings.
   */
  logger?: Logger;

  /**
   * Abort signal for cancellation.
   *
   * When fired, the agent should stop generation and clean up.
   */
  signal?: AbortSignal;

  /**
   * Override the model for this call.
   *
   * Accepts a string model ID or an AI SDK `LanguageModel` instance.
   */
  model?: Model;

  /**
   * Override the system prompt for this call.
   *
   * Can be a static string or a function that receives the input
   * and returns the system prompt.
   */
  system?: string | ((params: { input: unknown }) => string);

  /**
   * Override or extend tools for this call.
   *
   * Merged with the agent's base tools. Use `Partial<TTools>` to
   * replace specific tools, or add new ones via the index signature.
   */
  tools?: Partial<TTools> & Record<string, Tool>;

  /**
   * Override or extend subagents for this call.
   *
   * Merged with the agent's base subagents.
   */
  agents?: Partial<TSubAgents> & Record<string, Agent>;

  /**
   * Override max tool-loop steps for this call.
   *
   * Controls how many tool-loop iterations the agent will run
   * before stopping.
   */
  maxSteps?: number;

  /**
   * Override or set the output type for this call.
   *
   * Accepts an AI SDK `Output` strategy or a raw Zod schema:
   * - `Output.text()`, `Output.object()`, `Output.array()`, `Output.choice()`
   * - `z.object({ ... })` → auto-wrapped as `Output.object({ schema })`
   * - `z.array(z.object({ ... }))` → auto-wrapped as `Output.array({ element })`
   */
  output?: OutputParam;

  /**
   * Per-call hook — fires after base `onStart`.
   *
   * @param event - Event containing the input.
   * @param event.input - The input passed to `.generate()` or `.stream()`.
   */
  onStart?: (event: { input: unknown }) => void | Promise<void>;

  /**
   * Per-call hook — fires after base `onFinish`.
   *
   * @param event - Event containing the input, result, and duration.
   * @param event.input - The input passed to `.generate()` or `.stream()`.
   * @param event.result - The generation result.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: {
    input: unknown;
    result: GenerateResult;
    duration: number;
  }) => void | Promise<void>;

  /**
   * Per-call hook — fires after base `onError`.
   *
   * @param event - Event containing the input and error.
   * @param event.input - The input passed to `.generate()` or `.stream()`.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { input: unknown; error: Error }) => void | Promise<void>;

  /**
   * Per-call hook — fires after base `onStepFinish`.
   *
   * @param event - Event containing the step ID.
   * @param event.stepId - The ID of the tool-loop step that completed.
   */
  onStepFinish?: (event: {
    stepId: string;
    toolCalls: readonly { toolName: string; argsTextLength: number }[];
    toolResults: readonly { toolName: string; resultTextLength: number }[];
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  }) => void | Promise<void>;
}

/**
 * Configuration for creating an agent.
 *
 * Supports two modes:
 *
 * | Config | `.generate()` first param | How prompt is built |
 * |---|---|---|
 * | `input` + `prompt` provided | Typed `TInput` | `prompt({ input })` renders it |
 * | Both omitted | `string \| Message[]` | Passed directly to the model |
 *
 * @typeParam TInput - Agent input type (default: `string | Message[]`).
 * @typeParam TOutput - Agent output type (default: `string`).
 * @typeParam TTools - Record of tools available to this agent.
 * @typeParam TSubAgents - Record of subagents available to this agent.
 */
export interface AgentConfig<
  TInput,
  TOutput,
  TTools extends Record<string, Tool>,
  TSubAgents extends SubAgents,
> {
  /**
   * Unique agent name.
   *
   * Used in logging, trace entries, and hook events.
   */
  name: string;

  /**
   * Model to use for generation.
   *
   * Accepts a string model ID (resolved via `resolver`) or an
   * AI SDK `LanguageModel` instance — including middleware-wrapped models.
   *
   * When passing a string, a `resolver` must also be configured.
   *
   * @see {@link Model}
   */
  model: Model;

  /**
   * Model resolver for string model IDs.
   *
   * Required when `model` is a string. Created via `createModelResolver()`
   * from `@funkai/models`.
   *
   * @example
   * ```typescript
   * import { createModelResolver, openrouter } from '@funkai/models'
   * import { createOpenAI } from '@ai-sdk/openai'
   *
   * const resolver = createModelResolver({
   *   providers: { openai: createOpenAI({ apiKey: '...' }) },
   *   fallback: openrouter,
   * })
   *
   * const myAgent = agent({
   *   name: 'my-agent',
   *   model: 'openai/gpt-4.1',
   *   resolver,
   *   system: 'You are helpful.',
   * })
   * ```
   */
  resolver?: ModelResolver;

  /**
   * Zod schema for the agent's typed input.
   *
   * When provided alongside `prompt`, `.generate()` accepts `TInput`
   * as its first param and validates it against this schema.
   *
   * When omitted, `.generate()` accepts a raw `string` or `Message[]`
   * instead (simple mode).
   */
  input?: ZodType<TInput>;

  /**
   * Map typed input to the prompt sent to the model.
   *
   * Required when `input` is provided. Ignored when `input` is
   * omitted (the raw string/messages are used directly in simple mode).
   *
   * @param params - Object containing the validated input.
   * @param params.input - The validated input value.
   * @returns The prompt string or message array to send to the model.
   */
  prompt?: (params: { input: TInput }) => string | Message[];

  /**
   * System prompt.
   *
   * Can be a static string or a function that receives the validated
   * input and returns the system prompt dynamically.
   */
  system?: string | ((params: { input: TInput }) => string);

  /**
   * Tools available to this agent for function calling.
   *
   * Each tool is exposed to the model in the tool-loop. The model
   * can call these tools to gather information or perform actions.
   */
  tools?: TTools;

  /**
   * Subagents — automatically wrapped as tools the agent can delegate to.
   *
   * Each subagent becomes a callable tool that the parent agent can
   * invoke. Abort signals propagate automatically from parent to child.
   */
  agents?: TSubAgents;

  /**
   * Maximum tool-loop iterations.
   *
   * Controls how many times the agent will call tools before stopping.
   * Set higher for complex multi-step tasks, lower for simple queries.
   *
   * @default 20
   */
  maxSteps?: number;

  /**
   * Output type strategy.
   *
   * Controls the shape of the generation output. Accepts an AI SDK
   * `Output` strategy or a raw Zod schema:
   * - `Output.text()` — plain string (default).
   * - `Output.object({ schema })` — validated structured object.
   * - `Output.array({ element })` — validated array of elements.
   * - `Output.choice({ options })` — enum/classification.
   * - `z.object({ ... })` — auto-wrapped as `Output.object({ schema })`.
   * - `z.array(z.object({ ... }))` — auto-wrapped as `Output.array({ element })`.
   *
   * @default Output.text()
   */
  output?: OutputParam;

  /**
   * Pino-compatible logger.
   *
   * When omitted, the SDK creates a default pino instance at `info`
   * level. The framework automatically creates scoped child loggers
   * with contextual bindings (`agentId`).
   */
  logger?: Logger;

  /**
   * Hook: fires when the agent starts execution.
   *
   * @param event - Event containing the input.
   * @param event.input - The validated input value.
   */
  onStart?: (event: { input: TInput }) => void | Promise<void>;

  /**
   * Hook: fires when the agent finishes successfully.
   *
   * @param event - Event containing the input, result, and duration.
   * @param event.input - The validated input value.
   * @param event.result - The generation result.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: {
    input: TInput;
    result: GenerateResult<TOutput>;
    duration: number;
  }) => void | Promise<void>;

  /**
   * Hook: fires when the agent encounters an error.
   *
   * @param event - Event containing the input and error.
   * @param event.input - The validated input value.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { input: TInput; error: Error }) => void | Promise<void>;

  /**
   * Hook: fires after each tool-loop step completes.
   *
   * @param event - Event containing the step ID.
   * @param event.stepId - The ID of the completed tool-loop step.
   */
  onStepFinish?: (event: {
    stepId: string;
    toolCalls: readonly { toolName: string; argsTextLength: number }[];
    toolResults: readonly { toolName: string; resultTextLength: number }[];
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  }) => void | Promise<void>;
}

/**
 * A created agent — exposes `.generate()`, `.stream()`, and `.fn()`.
 *
 * Under the hood, agents run a tool loop (like `generateText` with tools)
 * until a stop condition is met. Everything is wrapped in `Result`
 * so callers never need try/catch.
 *
 * @typeParam TInput - Agent input type.
 * @typeParam TOutput - Agent output type.
 * @typeParam TTools - Record of tools.
 * @typeParam TSubAgents - Record of subagents.
 */
export interface Agent<
  TInput = string | Message[],
  TOutput = string,
  TTools extends Record<string, Tool> = Record<string, Tool>,
  TSubAgents extends SubAgents = Record<string, never>,
> {
  /**
   * Run the agent to completion.
   *
   * Executes the tool loop until the model produces a final response
   * or `maxSteps` is reached. Returns a `Result` wrapping the
   * generation result.
   *
   * @param input - Typed input (when `input` schema is configured)
   *   or `string | Message[]` in simple mode.
   * @param config - Optional per-call overrides for model, tools,
   *   output, hooks, etc.
   * @returns A `Result` wrapping the `GenerateResult`. On success,
   *   `result.ok` is `true` and generation fields are flat on the object.
   */
  generate(
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>,
  ): Promise<Result<GenerateResult<TOutput>>>;

  /**
   * Run the agent with streaming output.
   *
   * Returns immediately with `fullStream` — an `AsyncIterableStream`
   * of typed `StreamPart` events. `output` and `messages` are
   * promises that resolve after the stream completes.
   *
   * @param input - Typed input (when `input` schema is configured)
   *   or `string | Message[]` in simple mode.
   * @param config - Optional per-call overrides.
   * @returns A `Result` wrapping the `StreamResult`. On success,
   *   consume `result.fullStream` for typed events; await
   *   `result.output` / `result.messages` after the stream ends.
   */
  stream(
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>,
  ): Promise<Result<StreamResult<TOutput>>>;

  /**
   * Returns a plain function that calls `.generate()`.
   *
   * Use for clean single-function exports where you want to hide
   * the agent object and just expose a callable.
   *
   * @returns A function with the same signature as `.generate()`.
   *
   * @example
   * ```typescript
   * export const analyzeFile = fileAnalyzer.fn()
   * // Usage: const result = await analyzeFile({ filePath: '...' })
   * ```
   */
  fn(): (
    input: TInput,
    config?: AgentOverrides<TTools, TSubAgents>,
  ) => Promise<Result<GenerateResult<TOutput>>>;
}
