import type { LanguageModel as BaseLanguageModel } from "ai";

/**
 * AI SDK language model instance (v3 specification).
 *
 * Narrowed from the base `LanguageModel` union (which includes `string`) to
 * only concrete v3 model objects. This is required because AI SDK functions
 * like `wrapLanguageModel` expect `LanguageModelV3` specifically.
 *
 * When the AI SDK introduces a new specification version, update the
 * `specificationVersion` literal here and verify compatibility with
 * downstream consumers (e.g. `@funkai/agents` middleware).
 */
export type LanguageModel = Extract<BaseLanguageModel, { specificationVersion: "v3" }>;
