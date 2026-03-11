import {
  createOpenRouter as baseCreateOpenRouter,
  type OpenRouterProvider,
  type OpenRouterProviderSettings,
} from "@openrouter/ai-sdk-provider";

import type { ModelId } from "@/core/models/index.js";
import { type LanguageModel } from "@/core/provider/types.js";

/**
 * Create an OpenRouter provider instance with automatic API key resolution.
 *
 * Falls back to the `OPENROUTER_API_KEY` environment variable when
 * no explicit `apiKey` is provided in the options.
 *
 * @param options - Provider settings forwarded to `@openrouter/ai-sdk-provider`.
 * @returns A configured {@link OpenRouterProvider} instance.
 *
 * @example
 * ```typescript
 * const openrouter = createOpenRouter({ apiKey: 'sk-...' })
 * const m = openrouter('openai/gpt-5.2-codex')
 * ```
 */
export function createOpenRouter(options?: OpenRouterProviderSettings): OpenRouterProvider {
  const apiKey = resolveApiKey(options);
  return baseCreateOpenRouter({
    ...options,
    apiKey,
  });
}

function resolveApiKey(options: OpenRouterProviderSettings | undefined): string {
  if (options != null && options.apiKey != null) {
    return options.apiKey;
  }
  return getOpenRouterApiKey();
}

/**
 * Create a cached OpenRouter model resolver.
 *
 * The returned function caches the underlying provider and invalidates
 * when the API key changes at runtime.
 *
 * @returns A function that resolves a model ID to a {@link LanguageModel}.
 *
 * @private
 */
function createCachedOpenRouter(): (modelId: ModelId) => LanguageModel {
  const cache: { provider: OpenRouterProvider | undefined; apiKey: string | undefined } = {
    provider: undefined,
    apiKey: undefined,
  };
  return (modelId: ModelId): LanguageModel => {
    const apiKey = getOpenRouterApiKey();
    if (!cache.provider || cache.apiKey !== apiKey) {
      cache.provider = baseCreateOpenRouter({ apiKey });
      cache.apiKey = apiKey;
    }
    return cache.provider(modelId);
  };
}

/**
 * Shorthand for creating a single OpenRouter language model.
 *
 * Resolves the API key from the environment and returns a ready-to-use
 * {@link LanguageModel} that can be passed directly to AI SDK functions.
 *
 * The provider instance is cached at module scope and reused across
 * calls. If `OPENROUTER_API_KEY` changes at runtime, the cache is
 * invalidated and a new provider is created.
 *
 * @param modelId - An OpenRouter model identifier (e.g. `"openai/gpt-5.2-codex"`).
 * @returns A configured {@link LanguageModel} instance.
 *
 * @example
 * ```typescript
 * const m = openrouter('openai/gpt-5.2-codex')
 * ```
 */
export const openrouter: (modelId: ModelId) => LanguageModel = createCachedOpenRouter();

/**
 * Read the OpenRouter API key from the environment.
 *
 * @throws {Error} If `OPENROUTER_API_KEY` is not set.
 */
function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required. " +
        "Set it in your .env file or environment.",
    );
  }
  return apiKey;
}
