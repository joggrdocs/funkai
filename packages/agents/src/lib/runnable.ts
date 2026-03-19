import { isNil } from "es-toolkit";
import { has, isObject } from "es-toolkit/compat";
import type { ZodType } from "zod";

/**
 * Symbol key for internal runnable metadata.
 *
 * Stored on Agent and FlowAgent objects to enable composition:
 * `buildAITools()` reads this to wrap a Runnable as a delegatable
 * tool in parent agents.
 *
 * @internal
 */
export const RUNNABLE_META: unique symbol = Symbol.for("agent-sdk:runnable-meta");

/**
 * Symbol key for storing the full `AgentConfig` on an Agent object.
 *
 * Used by `evolve()` to read the base agent's config for merging
 * with overrides. Not exported from the package index.
 *
 * @internal
 */
export const AGENT_CONFIG: unique symbol = Symbol.for("agent-sdk:agent-config");

/**
 * Symbol key for storing `FlowAgentConfig` + handler on a FlowAgent object.
 *
 * Used by `evolve()` to read the base flow agent's config and handler
 * for merging with overrides. Not exported from the package index.
 *
 * @internal
 */
export const FLOW_AGENT_CONFIG: unique symbol = Symbol.for("agent-sdk:flow-agent-config");

/**
 * Metadata stored on Agent and FlowAgent objects via {@link RUNNABLE_META}.
 *
 * @internal
 */
export interface RunnableMeta {
  name: string;
  inputSchema?: ZodType;
}

/**
 * Check if a value is an Agent created via the `agent()` factory.
 *
 * @param value - The value to check.
 * @returns `true` if the value has stored agent config.
 *
 * @internal
 */
export function isAgent(value: unknown): boolean {
  return isObject(value) && has(value, AGENT_CONFIG);
}

/**
 * Check if a value is a FlowAgent created via the `flowAgent()` factory.
 *
 * @param value - The value to check.
 * @returns `true` if the value has stored flow agent config.
 *
 * @internal
 */
export function isFlowAgent(value: unknown): boolean {
  return isObject(value) && has(value, FLOW_AGENT_CONFIG);
}

/**
 * Read the stored `AgentConfig` from an Agent object.
 *
 * Returns `undefined` if the value is not an Agent with stored config.
 *
 * @internal
 */
export function getAgentConfig<T>(value: unknown): T | undefined {
  if (!isAgent(value)) {
    return undefined;
  }
  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
  const config = (value as Record<symbol, unknown>)[AGENT_CONFIG];
  if (isNil(config)) {
    return undefined;
  }
  return config as T;
}

/**
 * Read the stored `FlowAgentConfig` + handler from a FlowAgent object.
 *
 * Returns `undefined` if the value is not a FlowAgent with stored config.
 *
 * @internal
 */
export function getFlowAgentConfig<T>(value: unknown): T | undefined {
  if (!isFlowAgent(value)) {
    return undefined;
  }
  // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
  const config = (value as Record<symbol, unknown>)[FLOW_AGENT_CONFIG];
  if (isNil(config)) {
    return undefined;
  }
  return config as T;
}
