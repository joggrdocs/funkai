import { createProviderRegistry as baseCreateProviderRegistry } from "ai";

import type { ModelId } from "@/catalog/index.js";
import type { LanguageModel } from "@/provider/types.js";

/**
 * Extract the provider type accepted by the AI SDK's `createProviderRegistry`.
 *
 * @private
 */
type AIProviders = Parameters<typeof baseCreateProviderRegistry>[0];

/**
 * Configuration for {@link createProviderRegistry}.
 */
export interface ProviderRegistryConfig {
  /**
   * AI SDK provider instances keyed by prefix.
   *
   * When a model ID like `"openai/gpt-4.1"` is resolved, the prefix
   * `"openai"` is extracted and looked up in this map.
   *
   * @example
   * ```typescript
   * import { createOpenAI } from '@ai-sdk/openai'
   * import { anthropic } from '@ai-sdk/anthropic'
   *
   * const registry = createProviderRegistry({
   *   providers: {
   *     openai: createOpenAI({ apiKey: '...' }),
   *     anthropic,
   *   },
   * })
   * ```
   */
  readonly providers: AIProviders;
}

/**
 * A function that resolves a model ID to a {@link LanguageModel} instance.
 *
 * @param modelId - Catalog model identifier in `provider/model` format.
 * @returns The resolved AI SDK {@link LanguageModel}.
 *
 * @example
 * ```typescript
 * const model = registry("openai/gpt-4.1");
 * ```
 */
export type ProviderRegistry = (modelId: ModelId) => LanguageModel;

/**
 * Create a provider registry that resolves `provider/model` string IDs
 * to AI SDK {@link LanguageModel} instances.
 *
 * Thin wrapper around the AI SDK's `createProviderRegistry` that uses
 * `/` as the separator instead of `:`, matching the model ID format used
 * throughout the funkai catalog (e.g. `"openai/gpt-4.1"`).
 *
 * @param config - Provider mappings.
 * @returns A resolver function that maps model IDs to {@link LanguageModel} instances.
 *
 * @example
 * ```typescript
 * import { createOpenAI } from '@ai-sdk/openai'
 * import { anthropic } from '@ai-sdk/anthropic'
 * import { createProviderRegistry } from '@funkai/models'
 *
 * const registry = createProviderRegistry({
 *   providers: {
 *     openai: createOpenAI({ apiKey: '...' }),
 *     anthropic,
 *   },
 * })
 *
 * const m1 = registry('openai/gpt-4.1')
 * const m2 = registry('anthropic/claude-sonnet-4')
 * ```
 */
export function createProviderRegistry(config: ProviderRegistryConfig): ProviderRegistry {
  const inner = baseCreateProviderRegistry(config.providers, {
    separator: "/",
  });

  return (modelId: ModelId): LanguageModel => {
    if (!modelId.trim()) {
      throw new Error("Cannot resolve model: model ID is empty");
    }
    // Cast needed: AI SDK overloads expect `provider/model` template literal,
    // But our ModelId is a branded string union. The runtime validates the format.
    return inner.languageModel(modelId as `${string}/${string}`) as LanguageModel;
  };
}
