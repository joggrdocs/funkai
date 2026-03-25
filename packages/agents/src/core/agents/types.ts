import type {
  Experimental_DownloadFunction,
  GenerateTextResult,
  LanguageModelMiddleware,
  ModelMessage,
  OnToolCallFinishEvent,
  OnToolCallStartEvent,
  PrepareStepFunction,
  StreamTextResult,
  ToolCallRepairFunction,
  ToolChoice,
  ToolSet,
  UIMessage,
  UIMessageStreamOptions,
} from "ai";

// The AI SDK's `Output` is a merged namespace + interface. TypeScript resolves
// `import type { Output }` to the namespace, which can't be used as a type param.
// We only need this for the `Omit`'d fields (`output`, `experimental_output`), so
// the actual type param is irrelevant — `any` satisfies the `extends Output` constraint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AIOutput = any;
import type { CamelCase, SnakeCase } from "type-fest";
import type { ZodType } from "zod";

import type { OutputParam } from "@/core/agents/base/output.js";
import type { Logger } from "@/core/logger.js";
import type { Tool } from "@/core/tool.js";
import type { Model, StepFinishEvent, StepStartEvent, StreamPart } from "@/core/types.js";
import type { Result } from "@/utils/result.js";

export type { StepFinishEvent, StepStartEvent, StreamPart } from "@/core/types.js";

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
 * Minimal shared contract for generation results.
 *
 * Picks `usage` and `finishReason` from the AI SDK's `GenerateTextResult`
 * and adds a typed `output`. Both `GenerateResult` (full AI SDK passthrough)
 * and `FlowAgentGenerateResult` (flow-specific) extend this.
 *
 * @typeParam TOutput - The output type.
 */
export type BaseGenerateResult<TOutput = string> = Pick<
  GenerateTextResult<ToolSet, AIOutput>,
  "usage" | "finishReason"
> & {
  /** The generation output. */
  readonly output: TOutput;
};

/**
 * Result of a completed agent generation.
 *
 * Extends the AI SDK's `GenerateTextResult` with full field passthrough.
 * Only `output` is overridden to carry the agent's typed output.
 * Access messages via `result.response.messages`.
 *
 * @typeParam TOutput - The output type.
 *   - `string` for `Output.text()` (the default).
 *   - `T` for `Output.object({ schema })`.
 *   - `T[]` for `Output.array({ element })`.
 *   - `T` for `Output.choice({ options })`.
 */
export interface GenerateResult<TOutput = string>
  extends Omit<GenerateTextResult<ToolSet, AIOutput>, "output" | "experimental_output"> {
  /** The generation output. */
  readonly output: TOutput;
}

/**
 * Minimal shared contract for streaming results.
 *
 * Picks `usage`, `finishReason`, and `fullStream` from the AI SDK's
 * `StreamTextResult` and adds a typed `output`. Both `StreamResult`
 * (full AI SDK passthrough) and flow agent stream results extend this.
 *
 * @typeParam TOutput - The output type (available after stream completes).
 */
export type BaseStreamResult<TOutput = string> = Pick<
  StreamTextResult<ToolSet, AIOutput>,
  "usage" | "finishReason" | "fullStream"
> & {
  /** Resolves after the stream completes with the generation output. */
  readonly output: PromiseLike<TOutput>;
};

/**
 * Result of a streaming agent generation.
 *
 * Extends the AI SDK's `StreamTextResult` with full field passthrough.
 * Only `output` is overridden to carry the agent's typed output.
 * Access messages via `result.response` promise.
 *
 * @typeParam TOutput - The output type (available after stream completes).
 */
export interface StreamResult<TOutput = string>
  extends Omit<
    StreamTextResult<ToolSet, AIOutput>,
    "output" | "experimental_output" | "experimental_partialOutputStream"
  > {
  /** Resolves after the stream completes with the generation output. */
  readonly output: PromiseLike<TOutput>;
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
    result: BaseGenerateResult<TOutput>;
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
  onStepStart?: (event: StepStartEvent) => void | Promise<void>;

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

  /** Override the tool choice strategy for this call. */
  toolChoice?: ToolChoice<Record<string, unknown>>;

  /** Override provider-specific options for this call. */
  providerOptions?: Record<string, Record<string, unknown>>;

  /** Override active tools for this call. */
  activeTools?: string[];

  /** Override prepareStep for this call. */
  prepareStep?: PrepareStepFunction;

  /** Override repairToolCall for this call. */
  repairToolCall?: ToolCallRepairFunction<ToolSet>;

  /** Override HTTP headers for this call. */
  headers?: Record<string, string | undefined>;

  /** Override include settings for this call. */
  experimental_include?: { requestBody?: boolean; responseBody?: boolean };

  /** Override context for this call. */
  experimental_context?: unknown;

  /** Override download function for this call. */
  experimental_download?: Experimental_DownloadFunction | undefined;

  /** Override onToolCallStart for this call. */
  onToolCallStart?: (event: OnToolCallStartEvent) => void | Promise<void>;

  /** Override onToolCallFinish for this call. */
  onToolCallFinish?: (event: OnToolCallFinishEvent) => void | Promise<void>;
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
  | { messages: ModelMessage[]; prompt?: undefined; input?: undefined }
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
 * | Both omitted | `string \| ModelMessage[]` | Passed directly to the model |
 *
 * @typeParam TInput - Agent input type (default: `string | ModelMessage[]`).
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
   * When omitted, `.generate()` accepts a raw `string` or `ModelMessage[]`
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
  prompt?: (params: { input: TInput }) => string | ModelMessage[] | Promise<string | ModelMessage[]>;

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
   * The tool choice strategy. Default: 'auto'.
   *
   * Passed through to the AI SDK's `generateText`/`streamText`.
   */
  toolChoice?: ToolChoice<Record<string, unknown>>;

  /**
   * Additional provider-specific options.
   *
   * Passed through to the AI SDK and enable provider-specific
   * functionality.
   */
  providerOptions?: Record<string, Record<string, unknown>>;

  /**
   * Limits the tools available for the model to call without
   * changing the tool call and result types.
   */
  activeTools?: string[];

  /**
   * Function to provide per-step overrides (model, tools, messages).
   *
   * Called before each step in the tool loop.
   */
  prepareStep?: PrepareStepFunction;

  /**
   * Function that attempts to repair a tool call that failed to parse.
   */
  repairToolCall?: ToolCallRepairFunction<ToolSet>;

  /**
   * Additional HTTP headers sent with the request.
   *
   * Only applicable for HTTP-based providers.
   */
  headers?: Record<string, string | undefined>;

  /**
   * Include settings for request/response bodies in step results.
   */
  experimental_include?: { requestBody?: boolean; responseBody?: boolean };

  /**
   * User-defined context object that flows through the generation lifecycle.
   */
  experimental_context?: unknown;

  /**
   * Custom download function for URLs.
   */
  experimental_download?: Experimental_DownloadFunction | undefined;

  /**
   * Callback invoked before each tool execution begins.
   */
  onToolCallStart?: (event: OnToolCallStartEvent) => void | Promise<void>;

  /**
   * Callback invoked after each tool execution completes.
   */
  onToolCallFinish?: (event: OnToolCallFinishEvent) => void | Promise<void>;

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
   * Hook: fires when a step starts.
   *
   * Receives a unified {@link StepStartEvent}.
   */
  onStepStart?: (event: StepStartEvent) => void | Promise<void>;

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
  TInput = string | ModelMessage[],
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
