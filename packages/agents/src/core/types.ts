import type { AsyncIterableStream } from "ai";

import type { StreamPart } from "@/core/agents/base/types.js";
import type { LanguageModel } from "@/core/provider/types.js";
import type { Result } from "@/utils/result.js";

/**
 * A model reference — an AI SDK `LanguageModel` instance.
 *
 * Use any AI SDK provider function to create one, or wrap with
 * middleware via `wrapLanguageModel()`.
 *
 * @example
 * ```typescript
 * // AI SDK provider instance
 * import { openai } from '@ai-sdk/openai'
 * const myAgent = agent({
 *   name: 'my-agent',
 *   model: openai('gpt-4.1'),
 *   system: 'You are helpful.',
 * })
 *
 * // Middleware-wrapped model
 * import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'
 * import { anthropic } from '@ai-sdk/anthropic'
 * const reasoner = agent({
 *   name: 'reasoner',
 *   model: wrapLanguageModel({
 *     model: anthropic('claude-sonnet-4-5-20250929'),
 *     middleware: extractReasoningMiddleware({ tagName: 'think' }),
 *   }),
 *   system: 'Think step by step.',
 * })
 * ```
 */
export type Model = LanguageModel;

/**
 * A value that can be generated against — the shared contract
 * between Agent and FlowAgent.
 *
 * Both `Agent` and `FlowAgent` satisfy this interface. Any API that
 * accepts a `Runnable` works with either.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Runnable params accept implementation-specific options that cannot be narrowed at the interface level */
export interface Runnable<TInput = unknown, TOutput = unknown> {
  generate(params: {
    input?: TInput;
    prompt?: string;
    [key: string]: any;
  }): Promise<Result<{ output: TOutput }>>;
  stream(params: {
    input?: TInput;
    prompt?: string;
    [key: string]: any;
  }): Promise<Result<{ output: Promise<TOutput>; fullStream: AsyncIterableStream<StreamPart> }>>;
  fn(): (params: {
    input?: TInput;
    prompt?: string;
    [key: string]: any;
  }) => Promise<Result<{ output: TOutput }>>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
