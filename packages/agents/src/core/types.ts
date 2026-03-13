import type { AsyncIterableStream, LanguageModel } from "ai";

import type { StreamPart } from "@/core/agents/base/types.js";
import type { Result } from "@/utils/result.js";

/**
 * A model reference.
 *
 * Accepts either:
 * - A **string model ID** (e.g. `'openai/gpt-4.1'`) resolved via a
 *   configured `ModelResolver` at runtime.
 * - An **AI SDK `LanguageModel` instance** — including models wrapped
 *   with middleware via `wrapLanguageModel()`.
 *
 * When using a string, a `resolver` must be configured on the agent.
 *
 * @example
 * ```typescript
 * // String ID — resolved via a configured resolver
 * import { createModelResolver, openrouter } from '@funkai/models'
 *
 * const resolver = createModelResolver({ fallback: openrouter })
 * const agent1 = agent({
 *   name: 'my-agent',
 *   model: 'openai/gpt-4.1',
 *   resolver,
 *   system: 'You are helpful.',
 * })
 *
 * // AI SDK provider instance (no resolver needed)
 * import { openai } from '@ai-sdk/openai'
 * const agent2 = agent({
 *   name: 'my-agent',
 *   model: openai('gpt-4.1'),
 *   system: 'You are helpful.',
 * })
 *
 * // Middleware-wrapped model
 * import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'
 * import { anthropic } from '@ai-sdk/anthropic'
 * const agent3 = agent({
 *   name: 'reasoner',
 *   model: wrapLanguageModel({
 *     model: anthropic('claude-sonnet-4-5-20250929'),
 *     middleware: extractReasoningMiddleware({ tagName: 'think' }),
 *   }),
 *   system: 'Think step by step.',
 * })
 * ```
 */
export type Model = string | LanguageModel;

/** @deprecated Use `Model` instead. */
export type ModelRef = Model;

/**
 * A value that can be generated against — the shared contract
 * between Agent and Workflow.
 *
 * Both `Agent` and `Workflow` satisfy this interface. Any API that
 * accepts a `Runnable` works with either.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Runnable config accepts implementation-specific options that cannot be narrowed at the interface level */
export interface Runnable<TInput = unknown, TOutput = unknown> {
  generate(input: TInput, config?: any): Promise<Result<{ output: TOutput }>>;
  stream(
    input: TInput,
    config?: any,
  ): Promise<Result<{ output: Promise<TOutput>; fullStream: AsyncIterableStream<StreamPart> }>>;
  fn(): (input: TInput, config?: any) => Promise<Result<{ output: TOutput }>>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
