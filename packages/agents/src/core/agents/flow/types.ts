import type { ZodType } from "zod";

import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import type {
  Agent,
  GenerateParams,
  GenerateResult,
  Resolver,
  StreamResult,
} from "@/core/agents/types.js";
import type { Logger } from "@/core/logger.js";
import type { StepFinishEvent, StepInfo } from "@/core/types.js";
import type { Context } from "@/lib/context.js";
import type { TraceEntry } from "@/lib/trace.js";
import type { Result } from "@/utils/result.js";

export type { StepInfo } from "@/core/types.js";

/**
 * Record of named agent dependencies for a flow agent.
 *
 * Unlike regular agents where subagents become callable tools,
 * flow agent dependencies are passed to the handler via `agents`
 * so the handler can reference them explicitly in `$.agent()` calls.
 *
 * This makes agent references evolvable — `evolve(flow, { agents: { core: evolved } })`
 * shallow-merges the record, and the handler receives the evolved agent.
 *
 * @example
 * ```typescript
 * import { flowAgent } from '@funkai/agents'
 * import type { FlowSubAgents } from '@funkai/agents'
 *
 * const pipeline = flowAgent({
 *   name: 'pipeline',
 *   input: schema,
 *   agents: { core: coreAgent, writer: writerAgent } satisfies FlowSubAgents,
 * }, async ({ input, $, agents }) => {
 *   const result = await $.agent({ agent: agents.core, input: ... })
 *   return result
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlowSubAgents = Record<string, Agent<any, any, any, any, any> | FlowAgent<any, any>>;

/**
 * Result of a completed flow agent generation.
 *
 * Extends `GenerateResult` with flow-specific fields (`trace`, `duration`).
 * Consumers who only care about the `Runnable` / `Agent` contract see
 * `{ output, messages, usage, finishReason }`. Consumers who know they
 * have a `FlowAgent` can access `trace` and `duration`.
 *
 * @typeParam TOutput - The validated output type.
 */
export interface FlowAgentGenerateResult<TOutput> extends GenerateResult<TOutput> {
  /**
   * The full execution trace.
   *
   * A frozen tree of `TraceEntry` nodes representing every tracked `$`
   * operation that ran during the flow.
   */
  trace: readonly TraceEntry[];

  /**
   * Total wall-clock time in milliseconds.
   *
   * Measured from the start of the flow to the completion
   * of all operations.
   */
  duration: number;
}

/**
 * Shared configuration fields for all flow agent variants.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 */
export interface FlowAgentConfigBase<TInput> {
  /**
   * Unique flow agent name.
   *
   * Used in logging, trace entries, and hook events.
   */
  name: string;

  /**
   * Zod schema for validating flow agent input.
   *
   * The raw input passed to `.generate()` is validated against this
   * schema before the handler is called.
   */
  input: ZodType<TInput>;

  /**
   * Named agent dependencies for this flow agent.
   *
   * Unlike regular agents where subagents become callable tools,
   * flow agent dependencies are passed to the handler via the
   * `agents` param so the handler can reference them in `$.agent()`
   * calls. This makes agent references evolvable:
   *
   * ```typescript
   * evolve(flow, { agents: { core: evolvedCore } })
   * ```
   *
   * Shallow-merged by `evolve()` — override keys replace base keys,
   * unmentioned keys are preserved.
   *
   * @see {@link FlowSubAgents}
   */
  agents?: FlowSubAgents;

  /**
   * Pino-compatible logger.
   *
   * When omitted, the SDK creates a default console-based instance.
   * The framework automatically creates scoped child loggers
   * with contextual bindings (`flowAgentId`, `stepId`).
   * Accepts a static logger or a resolver function.
   *
   * @see {@link Resolver}
   */
  logger?: Resolver<TInput, Logger>;

  /**
   * Hook: fires when the flow agent starts execution.
   *
   * @param event - Event containing the validated input.
   */
  onStart?: (event: { input: TInput }) => void | Promise<void>;

  /**
   * Hook: fires when the flow agent encounters an error.
   *
   * @param event - Event containing the input and error.
   */
  onError?: (event: { input: TInput; error: Error }) => void | Promise<void>;

  /**
   * Hook: fires when any tracked `$` step starts.
   *
   * @param event - Event containing step info.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>;

  /**
   * Hook: fires when any tracked `$` step finishes.
   *
   * Receives a unified {@link StepFinishEvent}.
   */
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
}

/**
 * Flow agent config with a structured output schema.
 *
 * The handler must return a value matching `TOutput`, which is
 * validated against the `output` Zod schema before being returned.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 */
export interface FlowAgentConfigWithOutput<TInput, TOutput> extends FlowAgentConfigBase<TInput> {
  /**
   * Zod schema for validating flow agent output.
   *
   * The handler's return value is validated against this schema
   * before being returned to the caller.
   */
  output: ZodType<TOutput>;

  /**
   * Hook: fires when the flow agent finishes successfully.
   *
   * @param event - Event containing input, result, and duration.
   */
  onFinish?: (event: {
    input: TInput;
    result: FlowAgentGenerateResult<TOutput>;
    duration: number;
  }) => void | Promise<void>;
}

/**
 * Flow agent config without an output schema.
 *
 * The handler returns `void` — it orchestrates sub-agents and steps
 * without producing structured output. The collected text from
 * sub-agent responses becomes the `string` output.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 */
export interface FlowAgentConfigWithoutOutput<TInput> extends FlowAgentConfigBase<TInput> {
  /**
   * No output schema — the flow agent collects text from sub-agent
   * responses and returns it as a `string`.
   */
  output?: undefined;

  /**
   * Hook: fires when the flow agent finishes successfully.
   *
   * @param event - Event containing input, result (with string output), and duration.
   */
  onFinish?: (event: {
    input: TInput;
    result: FlowAgentGenerateResult<string>;
    duration: number;
  }) => void | Promise<void>;
}

/**
 * Configuration for creating a flow agent.
 *
 * Two variants:
 * - **With output**: Provide an `output` Zod schema. The handler returns
 *   `TOutput`, which is validated against the schema.
 * - **Without output**: Omit `output`. The handler returns `void` and
 *   the collected text from sub-agent responses becomes the `string` output.
 *
 * @typeParam TInput - Input type, inferred from the `input` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `output` Zod schema.
 */
export type FlowAgentConfig<TInput, TOutput = void> =
  | FlowAgentConfigWithOutput<TInput, TOutput>
  | FlowAgentConfigWithoutOutput<TInput>;

/**
 * Parameters passed to the flow agent handler function.
 *
 * @typeParam TInput - The validated input type.
 */
export interface FlowAgentParams<TInput> {
  /**
   * Validated input.
   */
  input: TInput;

  /**
   * Composable step builder utilities.
   *
   * Provides tracked operations (`$.step`, `$.agent`, `$.map`, etc.)
   * that register data flow for observability and produce synthetic
   * tool-call messages.
   */
  $: StepBuilder;

  /**
   * Scoped logger for the current flow execution.
   */
  log: Logger;

  /**
   * Named agent dependencies declared in the flow agent config.
   *
   * Use these references (instead of module-level imports) so that
   * `evolve()` can swap them out:
   *
   * ```typescript
   * async ({ input, $, agents }) => {
   *   await $.agent({ agent: agents.core, input: ... })
   * }
   * ```
   *
   * Defaults to an empty record when `agents` is not configured.
   */
  agents: FlowSubAgents;
}

/**
 * The flow agent handler function.
 *
 * This IS the flow — no step arrays, no definition objects.
 * State is just variables. `$` is passed in for tracked operations.
 *
 * @typeParam TInput - The validated input type.
 * @typeParam TOutput - The output type to return.
 */
export type FlowAgentHandler<TInput, TOutput> = (
  params: FlowAgentParams<TInput>,
) => Promise<TOutput>;

/**
 * A created flow agent — exposes `.generate()`, `.stream()`, and `.fn()`.
 *
 * Flow agents are imperative handlers that use `$` for tracked operations.
 * They satisfy the same `Runnable` interface as regular agents, so they
 * can be used as sub-agents, tool-wrapped delegatees, etc.
 *
 * @typeParam TInput - Validated input type.
 * @typeParam TOutput - Validated output type.
 */
export interface FlowAgent<TInput, TOutput> {
  /**
   * Run the flow agent to completion.
   *
   * Validates input, executes the handler, validates output, and
   * returns the result with messages, trace, and timing.
   *
   * @param params - Input and optional per-call overrides.
   * @returns A `Result` wrapping the `FlowAgentGenerateResult`.
   *
   * @example
   * ```typescript
   * const result = await myFlow.generate({ input: { targetDir: '.' } })
   * ```
   */
  generate(params: GenerateParams<TInput>): Promise<Result<FlowAgentGenerateResult<TOutput>>>;

  /**
   * Run the flow agent with streaming step progress.
   *
   * Returns immediately with `fullStream` — an `AsyncIterableStream`
   * of typed `StreamPart` events for each step. `output`, `messages`,
   * and `usage` are promises that resolve after the flow completes.
   *
   * @param params - Input and optional per-call overrides.
   * @returns A `Result` wrapping the `StreamResult`.
   */
  stream(params: GenerateParams<TInput>): Promise<Result<StreamResult<TOutput>>>;

  /**
   * Returns a plain function that calls `.generate()`.
   */
  fn(): (params: GenerateParams<TInput>) => Promise<Result<FlowAgentGenerateResult<TOutput>>>;
}

/**
 * @internal
 * Options that the engine uses to inject custom step augmentation
 * into flowAgent(). Not exported — only accessible within the package.
 */
export interface InternalFlowAgentOptions {
  augment$?: ($: StepBuilder, ctx: Context) => StepBuilder;
}
