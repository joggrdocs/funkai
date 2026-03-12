import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";

import { type LanguageModel } from "@/core/provider/types.js";

/**
 * Options for {@link withModelMiddleware}.
 */
interface WrapModelOptions {
  /** The base language model to wrap. */
  model: LanguageModel;

  /**
   * Additional middleware to apply before defaults (outermost).
   * Middleware runs in array order — first entry wraps outermost.
   */
  middleware?: LanguageModelMiddleware[];

  /**
   * Whether to include the AI SDK devtools middleware.
   *
   * Defaults to `true` when `NODE_ENV === 'development'`.
   * Set to `false` to disable in development, or `true` to force-enable.
   */
  devtools?: boolean;
}

/**
 * Wrap a language model with middleware.
 *
 * In development (`NODE_ENV === 'development'`), the AI SDK devtools
 * middleware is appended automatically. Any additional middleware
 * provided in the options is applied first (outermost).
 *
 * @param options - The model and optional middleware configuration.
 * @returns A wrapped language model with middleware applied.
 */
export async function withModelMiddleware(options: WrapModelOptions): Promise<LanguageModel> {
  const useDevtools =
    options.devtools === true ||
    (options.devtools !== false && process.env.NODE_ENV === "development");

  const defaultMiddleware: LanguageModelMiddleware[] = [];
  if (useDevtools) {
    const { devToolsMiddleware } = await import("@ai-sdk/devtools");
    defaultMiddleware.push(devToolsMiddleware());
  }

  const middleware: LanguageModelMiddleware[] = [];
  if (options.middleware) {
    middleware.push(...options.middleware, ...defaultMiddleware);
  } else {
    middleware.push(...defaultMiddleware);
  }

  if (middleware.length === 0) {
    return options.model;
  }

  return wrapLanguageModel({
    model: options.model,
    middleware,
  });
}
