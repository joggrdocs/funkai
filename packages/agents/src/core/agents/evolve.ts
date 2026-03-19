/* oxlint-disable @typescript-eslint/no-explicit-any -- evolve() operates on type-erased configs; generics are preserved by the public overloads */
import { isFunction, isNil, isNotNil } from "es-toolkit";

import { agent } from "@/core/agents/base/agent.js";
import { flowAgent } from "@/core/agents/flow/flow-agent.js";
import type {
  FlowAgent,
  FlowAgentConfig,
  FlowAgentConfigWithOutput,
  FlowAgentConfigWithoutOutput,
  FlowAgentHandler,
  FlowSubAgents,
} from "@/core/agents/flow/types.js";
import type { Agent, AgentConfig, SubAgents } from "@/core/agents/types.js";
import type { Tool } from "@/core/tool.js";
import { getAgentConfig, getFlowAgentConfig, isAgent, isFlowAgent } from "@/lib/runnable.js";

/**
 * Stored config + handler pair for a FlowAgent.
 *
 * @internal
 */
interface StoredFlowAgentConfig<TInput, TOutput> {
  readonly config: FlowAgentConfig<TInput, TOutput>;
  readonly handler: FlowAgentHandler<TInput, TOutput>;
}

/**
 * Create a new agent from an existing one with config overrides.
 *
 * Reads the stored config from the base agent, merges with overrides,
 * and calls `agent()` to produce a fresh instance. The original agent
 * is not modified.
 *
 * Merge logic:
 * - Scalars (name, model, system, maxSteps, logger, prompt, input, output,
 *   hooks): override replaces base.
 * - Records (tools, agents): shallow merge — `{ ...base, ...override }`.
 *
 * @typeParam TInput - Agent input type.
 * @typeParam TOutput - Agent output type.
 * @typeParam TTools - Record of tools.
 * @typeParam TSubAgents - Record of subagents.
 * @param base - The agent to evolve from.
 * @param overrides - Partial config overrides or mapper function.
 * @returns A new Agent with merged configuration.
 *
 * @example
 * ```typescript
 * import { agent, evolve } from '@funkai/agents'
 * import { openai } from '@ai-sdk/openai'
 *
 * const base = agent({
 *   name: 'reviewer',
 *   model: openai('gpt-4.1'),
 *   system: 'Review code.',
 *   tools: { lint, format },
 * })
 *
 * // Static overrides
 * const local = evolve(base, {
 *   name: 'reviewer-local',
 *   model: ({ input }) => localModel(),
 *   tools: { lint },
 * })
 *
 * // Mapper function — derive overrides from the current config.
 * // Note: config.model is a Resolver (may be a function or a Model).
 * const proxied = evolve(base, (config) => {
 *   if (isFunction(config.model)) {
 *     return { model: proxy('default-model') }
 *   }
 *   return { model: proxy(config.model.modelId) }
 * })
 * ```
 */
export function evolve<
  TInput,
  TOutput,
  TTools extends Record<string, Tool>,
  TSubAgents extends SubAgents,
>(
  base: Agent<TInput, TOutput, TTools, TSubAgents>,
  overrides:
    | Partial<AgentConfig<TInput, TOutput, TTools, TSubAgents>>
    | ((
        config: AgentConfig<TInput, TOutput, TTools, TSubAgents>,
      ) => Partial<AgentConfig<TInput, TOutput, TTools, TSubAgents>>),
): Agent<TInput, TOutput, TTools, TSubAgents>;

/**
 * Create a new flow agent from an existing one with config overrides.
 *
 * Reads the stored config and handler from the base flow agent, merges
 * config with overrides, and calls `flowAgent()` to produce a fresh
 * instance. Optionally swap the handler function.
 *
 * @typeParam TInput - Flow agent input type.
 * @typeParam TOutput - Flow agent output type.
 * @param base - The flow agent to evolve from.
 * @param overrides - Partial config overrides or mapper function.
 * @param handler - Optional replacement handler function.
 * @returns A new FlowAgent with merged configuration.
 *
 * @example
 * ```typescript
 * import { flowAgent, evolve } from '@funkai/agents'
 *
 * const base = flowAgent({ name: 'pipeline', input: schema }, handler)
 * const local = evolve(base, { logger: pinoLogger })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened to accept both FlowAgent output variants
export function evolve<TInput, TOutput = any>(
  base: FlowAgent<TInput, TOutput>,
  overrides:
    | Partial<FlowAgentConfig<TInput, TOutput>>
    | ((config: FlowAgentConfig<TInput, TOutput>) => Partial<FlowAgentConfig<TInput, TOutput>>),
  handler?: FlowAgentHandler<TInput, TOutput>,
): FlowAgent<TInput, TOutput>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- implementation signature accepts both overloads
export function evolve(
  base: unknown,
  overridesOrMapper: Record<string, any> | ((config: any) => Record<string, any>),
  handler?: unknown,
): unknown {
  if (isAgent(base)) {
    return evolveAgent(base, overridesOrMapper);
  }

  if (isFlowAgent(base)) {
    return evolveFlowAgent(base, overridesOrMapper, handler);
  }

  throw new Error(
    "evolve() requires an Agent or FlowAgent created via agent() or flowAgent(). " +
      "The provided value does not have stored configuration.",
  );
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Evolve a base agent by merging its stored config with overrides.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal helper; generics are preserved by the public overloads
function evolveAgent(
  base: unknown,
  overridesOrMapper: Record<string, any> | ((config: any) => Record<string, any>),
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal: stored config type is erased
  const baseConfig = getAgentConfig<AgentConfig<any, any, any, any>>(base);
  if (isNil(baseConfig)) {
    throw new Error("Cannot evolve: agent does not have stored configuration.");
  }

  const overrides = resolveOverrides(overridesOrMapper, baseConfig);
  const merged = mergeAgentConfigs(baseConfig, overrides);
  return agent(merged);
}

/**
 * Evolve a base flow agent by merging its stored config with overrides.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal helper; generics are preserved by the public overloads
function evolveFlowAgent(
  base: unknown,
  overridesOrMapper: Record<string, any> | ((config: any) => Record<string, any>),
  handler?: unknown,
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal: stored config type is erased
  const stored = getFlowAgentConfig<StoredFlowAgentConfig<any, any>>(base);
  if (isNil(stored)) {
    throw new Error("Cannot evolve: flow agent does not have stored configuration.");
  }

  const overrides = resolveOverrides(overridesOrMapper, stored.config);
  const merged = mergeFlowAgentConfigs(stored.config, overrides);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler type is erased internally
  const resolvedHandler = (handler ?? stored.handler) as FlowAgentHandler<any, any>;

  if (isFlowAgentConfigWithOutput(merged)) {
    return flowAgent(merged, resolvedHandler);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- widened for without-output variant
  return flowAgent(
    merged as FlowAgentConfigWithoutOutput<any>,
    resolvedHandler as FlowAgentHandler<any, void>,
  );
}

/**
 * Merge two agent configs. Scalars: override wins. Records: shallow merge.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal merge operates on erased types
function mergeAgentConfigs(
  base: AgentConfig<any, any, any, any>,
  overrides: Record<string, unknown>,
): AgentConfig<any, any, any, any> {
  const { tools: overrideTools, agents: overrideAgents, ...restOverrides } = overrides;
  return {
    ...base,
    ...restOverrides,
    tools: mergeRecordField(base.tools, overrideTools as Record<string, Tool> | undefined),
    agents: mergeRecordField(base.agents, overrideAgents as SubAgents | undefined),
  };
}

/**
 * Merge two flow agent configs. Scalars: override wins. Records (agents): shallow merge.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal merge operates on erased types
function mergeFlowAgentConfigs(
  base: FlowAgentConfig<any, any>,
  overrides: Record<string, unknown>,
): FlowAgentConfig<any, any> {
  const { agents: overrideAgents, ...restOverrides } = overrides;
  return {
    ...base,
    ...restOverrides,
    agents: mergeRecordField(base.agents, overrideAgents as FlowSubAgents | undefined),
  };
}

/**
 * Shallow merge two optional record fields.
 * If override is provided, merge `{ ...base, ...override }`.
 * If override is nil, return base as-is.
 *
 * @private
 */
function mergeRecordField<T extends Record<string, unknown>>(
  base: T | undefined,
  override: T | undefined,
): T | undefined {
  if (isNil(override)) {
    return base;
  }
  if (isNil(base)) {
    return override;
  }
  return { ...base, ...override };
}

/**
 * Resolve overrides from a static object or a mapper function.
 *
 * @private
 */
function resolveOverrides<T>(
  overridesOrMapper: Record<string, any> | ((config: T) => Record<string, any>),
  config: T,
): Record<string, any> {
  if (isFunction(overridesOrMapper)) {
    return overridesOrMapper(config);
  }
  return overridesOrMapper;
}

/**
 * Check if a flow agent config has an output schema.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- type guard for internal use
function isFlowAgentConfigWithOutput(
  config: FlowAgentConfig<any, any>,
): config is FlowAgentConfigWithOutput<any, any> {
  return Object.hasOwn(config, "output") && isNotNil(config.output);
}
