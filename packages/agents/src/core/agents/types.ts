import type {
  AsyncIterableStream,
  LanguageModelMiddleware,
  ModelMessage,
  UIMessage,
  UIMessageStreamOptions,
} from "ai";
import type { CamelCase, SnakeCase } from "type-fest";
import type { ZodType } from "zod";

import type { OutputParam } from "@/core/agents/base/output.js";
import type { Logger } from "@/core/logger.js";
import type { TokenUsage } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type { Model, StepFinishEvent, StepInfo, StreamPart } from "@/core/types.js";
import type { Result } from "@/utils/result.js";

export type { StepFinishEvent, StepInfo, StreamPart } from "@/core/types.js";

/**
 * A value that can be static or dynamically resolved from the agent's input.
 *
 * When `T` is a plain value, it's used directly. When it's a function
 * matching `(params: { input: TInput }) => T | Promise<T>`, it's called
 * at `.generate()` / `.stream()` time with the validated input.
 *
 * This enables environment-aware configuration — different models, tools,
 * prompts, or loggers depending on runtime context.
 *
 * @typeParam TInput - The agent's input type.
 * @typeParam T - The resolved value type.
 *
 * @example
 * ```typescript
 * // Static value
 * model: openai('gpt-4.1')
 *
 * // Dynamic resolver
 * model: ({ input }) => input.runtime === 'local' ? joggr() : openrouter('...')
 *
 * // Async resolver
 * model: async ({ input }) => await fetchModelForPlan(input.plan)
 * ```
 */
export type Resolver<TInput, T> = T | ((params: { input: TInput }) => T | Promise<T>);

/**
 * Compile-time guard that validates a string is a provider-safe tool name.
 *
 * Accepts camelCase and snake_case — the two naming styles that work
 * across all major LLM providers (OpenAI, Anthropic, Gemini, Mistral).
 * Rejects kebab-case, dot.case, colons, spaces, and other formats that
 * contain characters outside `^[a-zA-Z_][a-zA-Z0-9_]*$`.
 *
 * Uses type-fest's `SnakeCase` and `CamelCase` converters as validators:
 * if converting `S` to snake_case (or camelCase) returns the same string,
 * then `S` is already in that format and therefore safe.
 *
 * @remarks
 * Runtime validation in `validateToolName()` is the authoritative check.
 * This type is a best-effort compile-time guard.
 *
 * @param S - Candidate key string to validate; must start with a letter or
 *   underscore and contain only letters, digits, or underscores.
 * @returns The input string `S` if it matches camelCase or snake_case, otherwise `never`.
 *
 * @example
 * ```typescript
 * type Good = ToolName<'myAgent'>;     // 'myAgent'
 * type Also = ToolName<'my_agent'>;    // 'my_agent'
 * type Bad  = ToolName<'my-agent'>;    // never
 * type Nope = ToolName<'agent:plan'>;  // never
 * ```
 */
export type ToolName<S extends string> = S extends ""
  ? never
  : S extends Uppercase<S>
    ? S
    : S extends SnakeCase<S>
      ? S
      : S extends CamelCase<S>
        ? S
        : never;

/**
 * Record of named subagents available for delegation.
 *
 * Each entry maps a subagent name to an {@link Agent} instance. When
 * passed to an agent's `agents` config, each subagent is automatically
 * wrapped as a callable tool that the parent can invoke during its
 * tool loop. Abort signals propagate from parent to child.
 *
 * Keys must be provider-safe identifiers matching `^[a-zA-Z_][a-zA-Z0-9_]*$`
 * — camelCase or snake_case only. Non-alphanumeric characters (except
 * underscore) are rejected at both the type level ({@link ToolName})
 * and at runtime.
 *
 * @example
 * ```typescript
 * import { agent } from '@funkai/agents'
 * import type { SubAgents } from '@funkai/agents'
 *
 * import { openai } from '@ai-sdk/openai'
 *
 * const researcher = agent({
 *   name: 'researcher',
 *   model: openai('gpt-4.1'),
 *   system: 'You research topics and return factual summaries.',
 * })
 *
 * const summarizer = agent({
 *   name: 'summarizer',
 *   model: openai('gpt-4.1-mini'),
 *   system: 'You condense text into concise bullet points.',
 * })
 *
 * const orchestrator = agent({
 *   name: 'orchestrator',
 *   model: openai('gpt-4.1'),
 *   system: 'Coordinate research and summarization.',
 *   agents: { researcher, summarizer } satisfies SubAgents,
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubAgents = Record<string, Agent<any, any, any, any, any>>;

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

  /**
   * Creates a plain text stream HTTP response.
   *
   * Each text delta is encoded as UTF-8 and sent as a separate chunk.
   * Non-text events are ignored. Useful for API endpoints (Hono,
   * Express, Bun) that return plain streamed text.
   *
   * Note: this reads from the underlying AI SDK stream, not from
   * `fullStream`. Do not consume both simultaneously.
   *
   * @param init - Optional response headers, status code, and status text.
   * @returns A web standard `Response` with streamed text content.
   *
   * @example
   * ```typescript
   * app.post('/chat', async (c) => {
   *   const result = await myAgent.stream({ prompt: 'Hello' });
   *   if (!result.ok) return c.text('Error', 500);
   *   return result.toTextStreamResponse();
   * });
   * ```
   */
  toTextStreamResponse(init?: ResponseInit): Response;

  /**
   * Creates a UI message stream HTTP response.
   *
   * Returns a `Response` suitable for the Vercel AI SDK's `useChat`
   * hook on the client. Includes tool calls, tool results, reasoning,
   * sources, and other structured events.
   *
   * Note: this reads from the underlying AI SDK stream, not from
   * `fullStream`. Do not consume both simultaneously.
   *
   * @param options - Optional response init and UI message stream options.
   * @returns A web standard `Response` with a UI message stream body.
   *
   * @example
   * ```typescript
   * app.post('/chat', async (c) => {
   *   const result = await myAgent.stream({ prompt: 'Hello' });
   *   if (!result.ok) return c.text('Error', 500);
   *   return result.toUIMessageStreamResponse();
   * });
   * ```
   */
  toUIMessageStreamResponse<UI_MESSAGE extends UIMessage = UIMessage>(
    options?: ResponseInit & UIMessageStreamOptions<UI_MESSAGE>,
  ): Response;
}

/**
 * Shared fields for all `.generate()` / `.stream()` param types.
 *
 * Contains the common fields shared by agents and flow agents:
 * logger, signal, timeout, and lifecycle hooks.
 *
 * @typeParam TInput - The agent's input type.
 *
 * @private — use `GenerateParams` instead.
 */
export interface BaseGenerateParams<TInput = unknown, TOutput = string> {
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
  signal?: AbortSignal | undefined;

  /**
   * Timeout in milliseconds.
   *
   * When set, the call is automatically aborted after the specified
   * duration. Internally creates an `AbortSignal` that fires after
   * the timeout.
   */
  timeout?: number;

  /**
   * Per-call hook — fires after base `onStart`.
   *
   * @param event - Event containing the input.
   * @param event.input - The resolved input value.
   */
  onStart?: (event: { input: TInput }) => void | Promise<void>;

  /**
   * Per-call hook — fires after base `onFinish`.
   *
   * @param event - Event containing the input, result, and duration.
   * @param event.input - The resolved input value.
   * @param event.result - The generation result.
   * @param event.duration - Wall-clock time in milliseconds.
   */
  onFinish?: (event: {
    input: TInput;
    result: GenerateResult<TOutput>;
    duration: number;
  }) => void | Promise<void>;

  /**
   * Per-call hook — fires after base `onError`.
   *
   * @param event - Event containing the input and error.
   * @param event.input - The resolved input value.
   * @param event.error - The error that occurred.
   */
  onError?: (event: { input: TInput; error: Error }) => void | Promise<void>;

  /**
   * Per-call hook — fires when a step starts.
   *
   * Used by flow agents to receive step-start notifications.
   * Agents accept but ignore this field for type compatibility.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>;

  /**
   * Per-call hook — fires after base `onStepFinish`.
   *
   * Receives a unified {@link StepFinishEvent} that carries both
   * agent tool-loop fields and flow orchestration fields.
   */
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
}

/**
 * Agent-specific overrides for `.generate()` and `.stream()` calls.
 *
 * @typeParam TTools - The agent's tool record type.
 * @typeParam TSubAgents - The agent's subagent record type.
 *
 * @private — use `GenerateParams` instead.
 */
interface AgentGenerateOverrides<
  TTools extends Record<string, Tool> = Record<string, Tool>,
  TSubAgents extends SubAgents = Record<string, never>,
> {
  /**
   * Override the model for this call.
   *
   * Pass an AI SDK `LanguageModel` instance.
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
  tools?: (Partial<TTools> & Record<string, Tool>) | undefined;

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
}

/**
 * Input union — exactly one of `prompt`, `messages`, or `input`.
 *
 * Shared by both agents and flow agents.
 *
 * @typeParam TInput - The typed input type.
 * @private
 */
type InputUnion<TInput> =
  | { prompt: string; messages?: undefined; input?: undefined }
  | { messages: Message[]; prompt?: undefined; input?: undefined }
  | { input: TInput; prompt?: undefined; messages?: undefined };

/**
 * Unified parameters for agent `.generate()` and `.stream()`.
 *
 * Combines input and per-call overrides into a single object
 * (mirrors the Vercel AI SDK pattern). Input is specified via exactly
 * one of three fields: `prompt`, `messages`, or `input`.
 *
 * Override fields replace the base config for that call only. Per-call
 * hooks **merge** with base hooks — base fires first, then call-level.
 *
 * @typeParam TInput - The agent's typed input type.
 * @typeParam TTools - The agent's tool record type.
 * @typeParam TSubAgents - The agent's subagent record type.
 *
 * @example
 * ```typescript
 * // Simple mode — string prompt
 * await myAgent.generate({ prompt: 'Hello' })
 *
 * // Simple mode — message array
 * await myAgent.generate({ messages: [{ role: 'user', content: 'Hi' }] })
 *
 * // Typed mode — structured input
 * await myAgent.generate({ input: { topic: 'TypeScript' } })
 *
 * // With overrides
 * await myAgent.generate({ prompt: 'Hello', model: openai('gpt-4.1'), signal })
 * ```
 */
export type GenerateParams<
  TInput = unknown,
  TTools extends Record<string, Tool> = Record<string, Tool>,
  TSubAgents extends SubAgents = Record<string, never>,
  TOutput = string,
> = BaseGenerateParams<TInput, TOutput> &
  AgentGenerateOverrides<TTools, TSubAgents> &
  InputUnion<TInput>;

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
  TModel extends Resolver<TInput, Model> = Resolver<TInput, Model>,
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
   * Pass an AI SDK `LanguageModel` instance — including middleware-wrapped
   * models via `wrapLanguageModel()`. Accepts a static value or a
   * resolver function that receives the validated input.
   *
   * @see {@link Model}
   * @see {@link Resolver}
   */
  model: TModel;

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
   * Async prompt functions are supported.
   *
   * @param params - Object containing the validated input.
   * @param params.input - The validated input value.
   * @returns The prompt string or message array to send to the model.
   */
  prompt?: (params: { input: TInput }) => string | Message[] | Promise<string | Message[]>;

  /**
   * System prompt.
   *
   * Can be a static string or a resolver function that receives the
   * validated input and returns the system prompt dynamically.
   * Async resolvers are supported.
   *
   * @see {@link Resolver}
   */
  system?: Resolver<TInput, string> | undefined;

  /**
   * Tools available to this agent for function calling.
   *
   * Each tool is exposed to the model in the tool-loop. The model
   * can call these tools to gather information or perform actions.
   * Accepts a static record or a resolver function.
   *
   * @see {@link Resolver}
   */
  tools?: Resolver<TInput, TTools>;

  /**
   * Subagents — automatically wrapped as tools the agent can delegate to.
   *
   * Each subagent becomes a callable tool that the parent agent can
   * invoke. Abort signals propagate automatically from parent to child.
   *
   * Keys must match `^[a-zA-Z_][a-zA-Z0-9_]*$` (camelCase or snake_case).
   * Non-alphanumeric characters (except underscore) cause a runtime
   * error from validation. Accepts a static record or a resolver function.
   *
   * @see {@link Resolver}
   */
  agents?: Resolver<TInput, TSubAgents>;

  /**
   * Maximum tool-loop iterations.
   *
   * Controls how many times the agent will call tools before stopping.
   * Set higher for complex multi-step tasks, lower for simple queries.
   * Accepts a static number or a resolver function.
   *
   * @default 20
   * @see {@link Resolver}
   */
  maxSteps?: Resolver<TInput, number>;

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
   * Language model middleware to apply.
   *
   * An array of AI SDK `LanguageModelMiddleware` instances applied
   * before default middleware (outermost). Middleware runs in array
   * order — the first entry wraps outermost.
   *
   * @example
   * ```typescript
   * agent({
   *   name: 'my-agent',
   *   model: openai('gpt-4.1'),
   *   middleware: [loggingMiddleware, rateLimitMiddleware],
   *   tools: { ... },
   * })
   * ```
   *
   * @see {@link https://ai-sdk.dev/docs/ai-sdk-core/middleware}
   */
  middleware?: LanguageModelMiddleware[];

  /**
   * Whether to enable the `addToolInputExamplesMiddleware`.
   *
   * When enabled, `inputExamples` defined on tools are appended to
   * each tool's description before the model sees it — ensuring
   * models receive usage examples that guide correct tool invocation.
   *
   * @default true
   */
  toolInputExamples?: boolean;

  /**
   * Pino-compatible logger.
   *
   * When omitted, the SDK creates a default pino instance at `info`
   * level. The framework automatically creates scoped child loggers
   * with contextual bindings (`agentId`). Accepts a static logger or
   * a resolver function.
   *
   * @see {@link Resolver}
   */
  logger?: Resolver<TInput, Logger>;

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
   * Hook: fires after each step completes.
   *
   * Receives a unified {@link StepFinishEvent}.
   */
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
}

/**
 * Overrides for evolving an agent via `evolve()`.
 *
 * Accepts a partial config object or a mapper function that receives the
 * current config and returns partial overrides. Scalars replace the base;
 * record fields (tools, agents) are shallow-merged.
 *
 * @typeParam TInput - Agent input type.
 * @typeParam TOutput - Agent output type.
 * @typeParam TTools - Record of tools.
 * @typeParam TSubAgents - Record of subagents.
 * @typeParam TModel - Model resolver type.
 *
 * @example
 * ```typescript
 * // Static overrides
 * const overrides: AgentOverrides<string, string, Tools, SubAgents, Model> = {
 *   name: 'reviewer-local',
 *   model: openai('gpt-4.1-mini'),
 * }
 *
 * // Mapper function
 * const overrides: AgentOverrides<string, string, Tools, SubAgents, Model> = (config) => ({
 *   name: `${config.name}-local`,
 * })
 * ```
 */
export type AgentOverrides<
  TInput,
  TOutput,
  TTools extends Record<string, Tool>,
  TSubAgents extends SubAgents,
  TModel extends Resolver<TInput, Model> = Resolver<TInput, Model>,
> =
  | Partial<AgentConfig<TInput, TOutput, TTools, TSubAgents, TModel>>
  | ((
      config: AgentConfig<TInput, TOutput, TTools, TSubAgents, TModel>,
    ) => Partial<AgentConfig<TInput, TOutput, TTools, TSubAgents, TModel>>);

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
  TModel extends Resolver<TInput, Model> = Resolver<TInput, Model>,
> {
  /**
   * The model (or resolver) used by this agent.
   *
   * Exposes the value passed via `AgentConfig.model` so that
   * `evolve()` can infer and preserve the concrete model type.
   */
  readonly model: TModel;

  /**
   * Run the agent to completion.
   *
   * Executes the tool loop until the model produces a final response
   * or `maxSteps` is reached. Returns a `Result` wrapping the
   * generation result.
   *
   * @param params - Input and optional per-call overrides.
   * @returns A `Result` wrapping the `GenerateResult`. On success,
   *   `result.ok` is `true` and generation fields are flat on the object.
   *
   * @example
   * ```typescript
   * // Simple mode
   * const result = await myAgent.generate({ prompt: 'Hello' })
   *
   * // Typed mode
   * const result = await myAgent.generate({ input: { topic: 'AI' } })
   * ```
   */
  generate(
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ): Promise<Result<GenerateResult<TOutput>>>;

  /**
   * Run the agent with streaming output.
   *
   * Returns immediately with `fullStream` — an `AsyncIterableStream`
   * of typed `StreamPart` events. `output` and `messages` are
   * promises that resolve after the stream completes.
   *
   * @param params - Input and optional per-call overrides.
   * @returns A `Result` wrapping the `StreamResult`. On success,
   *   consume `result.fullStream` for typed events; await
   *   `result.output` / `result.messages` after the stream ends.
   */
  stream(
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
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
   * // Usage: const result = await analyzeFile({ input: { filePath: '...' } })
   * ```
   */
  fn(): (
    params: GenerateParams<TInput, TTools, TSubAgents, TOutput>,
  ) => Promise<Result<GenerateResult<TOutput>>>;
}
