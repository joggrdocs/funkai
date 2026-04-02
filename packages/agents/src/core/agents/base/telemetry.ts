import type { TelemetrySettings } from "ai";
import { isNil } from "es-toolkit";

import type { AgentChainEntry } from "@/core/types.js";

/** Metadata key for the serialized agent ancestry chain. */
const AGENT_CHAIN_METADATA_KEY = "funkai.agentChain";

/**
 * Merge config-level and per-call telemetry settings, then auto-enrich
 * with agent identity and chain metadata.
 *
 * Scalars from `override` take precedence over `config`. Metadata
 * records are shallow-merged (both levels + auto-injected chain).
 *
 * Returns `undefined` when both inputs are nil — the caller's
 * `pickBy(isNotNil)` strips the field so `experimental_telemetry`
 * never reaches the AI SDK unless the user opts in.
 *
 * @param params - Resolution inputs.
 * @param params.config - Telemetry from `AgentConfig` / `FlowAgentConfigBase`.
 * @param params.override - Per-call override from `GenerateParams`.
 * @param params.agentName - The agent's `config.name`, used as fallback `functionId`.
 * @param params.agentChain - Current agent ancestry chain.
 * @returns Merged `TelemetrySettings`, or `undefined` when both inputs are nil.
 *
 * @example
 * ```typescript
 * const telemetry = resolveTelemetry({
 *   config: { isEnabled: true },
 *   override: { metadata: { userId: 'u-123' } },
 *   agentName: 'summarizer',
 *   agentChain: [{ id: 'pipeline' }, { id: 'summarizer' }],
 * })
 * // → { isEnabled: true, functionId: 'summarizer',
 * //     metadata: { userId: 'u-123', 'funkai.agentChain': 'pipeline > summarizer' } }
 * ```
 */
export function resolveTelemetry(params: {
  readonly config: TelemetrySettings | undefined;
  readonly override: TelemetrySettings | undefined;
  readonly agentName: string;
  readonly agentChain: readonly AgentChainEntry[];
}): TelemetrySettings | undefined {
  const { config, override, agentName, agentChain } = params;

  if (isNil(config) && isNil(override)) {
    return undefined;
  }

  return {
    ...config,
    ...override,
    functionId: override?.functionId ?? config?.functionId ?? agentName,
    metadata: {
      ...config?.metadata,
      ...override?.metadata,
      [AGENT_CHAIN_METADATA_KEY]: agentChain.map((e) => e.id).join(" > "),
    },
  };
}
