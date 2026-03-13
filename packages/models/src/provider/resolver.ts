import type { ModelId } from "@/catalog/index.js";
import { openrouter } from "@/provider/openrouter.js";
import type { LanguageModel } from "@/provider/types.js";

/**
 * A function that resolves a provider-specific model name to a {@link LanguageModel}.
 *
 * @example
 * ```typescript
 * import { createOpenAI } from '@ai-sdk/openai'
 *
 * const factory: ProviderFactory = createOpenAI({ apiKey: '...' })
 * const model = factory('gpt-4.1')
 * ```
 */
export type ProviderFactory = (modelName: string) => LanguageModel;

/**
 * Mapping from provider prefix (e.g. `"openai"`, `"anthropic"`) to a factory
 * that creates {@link LanguageModel} instances for that provider.
 */
export type ProviderMap = Readonly<Record<string, ProviderFactory>>;

/**
 * Configuration for {@link createModelResolver}.
 */
export interface ModelResolverConfig {
  /**
   * Direct AI SDK provider mappings by prefix.
   *
   * When a model ID like `"openai/gpt-4.1"` is resolved, the prefix
   * `"openai"` is extracted and looked up in this map. If found, the
   * factory receives the model portion (`"gpt-4.1"`).
   */
  readonly providers?: ProviderMap;

  /**
   * Whether to fall back to OpenRouter for unmapped providers.
   *
   * @defaultValue true
   */
  readonly fallbackToOpenRouter?: boolean;
}

/**
 * A function that resolves a model ID to a {@link LanguageModel} instance.
 */
export type ModelResolver = (modelId: ModelId) => LanguageModel;

/**
 * Create a model resolver with configurable provider mappings.
 *
 * When a model ID like `"openai/gpt-4.1"` is resolved:
 * 1. The provider prefix (`"openai"`) is extracted
 * 2. If a direct provider is mapped for that prefix, it receives the model portion (`"gpt-4.1"`)
 * 3. Otherwise, OpenRouter is used with the full ID
 *
 * @param config - Provider mappings and fallback configuration.
 * @returns A resolver function that maps model IDs to {@link LanguageModel} instances.
 *
 * @example
 * ```typescript
 * import { createOpenAI } from '@ai-sdk/openai'
 * import { createAnthropic } from '@ai-sdk/anthropic'
 *
 * const resolve = createModelResolver({
 *   providers: {
 *     openai: createOpenAI({ apiKey: '...' }),
 *     anthropic: createAnthropic({ apiKey: '...' }),
 *   },
 * })
 *
 * const m1 = resolve('openai/gpt-4.1')           // uses @ai-sdk/openai directly
 * const m2 = resolve('meta-llama/llama-4-scout')  // falls back to OpenRouter
 * ```
 */
export function createModelResolver(config?: ModelResolverConfig): ModelResolver {
  const providers = config?.providers ?? {};
  const fallback = config?.fallbackToOpenRouter !== false;

  return (modelId: ModelId): LanguageModel => {
    if (!modelId.trim()) {
      throw new Error("Cannot resolve model: model ID is empty");
    }

    const slashIndex = modelId.indexOf("/");

    if (slashIndex === -1) {
      if (fallback) {
        return openrouter(modelId);
      }
      throw new Error(
        `Cannot resolve model "${modelId}": no provider prefix and OpenRouter fallback is disabled`,
      );
    }

    const prefix = modelId.slice(0, slashIndex);
    // eslint-disable-next-line security/detect-object-injection -- Prefix extracted from user model ID, used as record key lookup
    const factory = providers[prefix];

    if (factory) {
      const modelName = modelId.slice(slashIndex + 1);
      return factory(modelName);
    }

    if (fallback) {
      return openrouter(modelId);
    }

    throw new Error(
      `Cannot resolve model "${modelId}": no provider mapped for "${prefix}" and OpenRouter fallback is disabled`,
    );
  };
}
