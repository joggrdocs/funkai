import type { LanguageModelUsage } from "ai";
import { tool } from "ai";
import { match, P } from "ts-pattern";
import type { ZodType } from "zod";
import { z } from "zod";

import type { Agent, Message } from "@/core/agents/base/types.js";
import type { LanguageModel, TokenUsage } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type { Model } from "@/core/types.js";
import type { ModelResolver } from "@funkai/models";
import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";

/**
 * Resolve a display name for a sub-agent tool from its runnable
 * metadata, falling back to the provided name.
 *
 * @param meta - The runnable metadata, or undefined if not available.
 * @param fallback - The fallback name to use if metadata is missing.
 * @returns The resolved tool name.
 *
 * @private
 */
function resolveToolName(meta: RunnableMeta | undefined, fallback: string): string {
  if (meta != null && meta.name != null) {
    return meta.name;
  }
  return fallback;
}

/**
 * Resolve a {@link Model} to an AI SDK `LanguageModel`.
 *
 * When `ref` is already a `LanguageModel`, it is returned as-is.
 * When `ref` is a string model ID, the optional `resolver` is used
 * to convert it. If no resolver is provided, an error is thrown.
 *
 * @param ref - A string model ID or an AI SDK `LanguageModel` instance.
 * @param resolver - Optional resolver for string model IDs.
 * @returns The resolved `LanguageModel`.
 */
export function resolveModel(ref: Model, resolver?: ModelResolver): LanguageModel {
  if (typeof ref === "string") {
    if (!resolver) {
      throw new Error(
        `Cannot resolve string model ID "${ref}": no resolver configured. ` +
          `Pass a ModelResolver via agent config, or pass an AI SDK LanguageModel instance directly.`,
      );
    }
    return resolver(ref);
  }
  return ref as LanguageModel;
}

/**
 * Merge `Tool` records and wrap subagent `Runnable` objects into AI SDK
 * tool format for `generateText` / `streamText`.
 *
 * Tools created via `tool()` are already AI SDK tools and are
 * passed through directly. Only subagents need wrapping.
 *
 * Parent tools are automatically forwarded to sub-agents so they
 * can access the same capabilities (e.g. sandbox filesystem tools)
 * without explicit injection at each call site.
 */
export function buildAITools(
  tools?: Record<string, Tool>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Agent generic params are contravariant; `unknown` breaks assignability
  agents?: Record<string, Agent<any, any, any, any>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ToolSet requires `any` values; `unknown` breaks assignability with AI SDK
): Record<string, any> | undefined {
  const hasTools = tools != null && Object.keys(tools).length > 0;
  const hasAgents = agents != null && Object.keys(agents).length > 0;

  if (!hasTools && !hasAgents) {
    return undefined;
  }

  const agentTools = agents
    ? Object.fromEntries(
        Object.entries(agents).map(([name, runnable]) => {
          // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
          const meta = (runnable as unknown as Record<symbol, unknown>)[RUNNABLE_META] as
            | RunnableMeta
            | undefined;
          const toolName = resolveToolName(meta, name);
          const agentToolName = `agent:${name}`;

          const agentTool =
            meta != null && meta.inputSchema != null
              ? tool({
                  description: `Delegate to ${toolName}`,
                  inputSchema: meta.inputSchema,
                  execute: async (input, { abortSignal }) => {
                    const r = await runnable.generate(input, { signal: abortSignal, tools });
                    if (!r.ok) {
                      throw new Error(r.error.message);
                    }
                    return r.output;
                  },
                })
              : tool({
                  description: `Delegate to ${toolName}`,
                  inputSchema: z.object({ prompt: z.string().describe("The prompt to send") }),
                  execute: async (input: { prompt: string }, { abortSignal }) => {
                    const r = await runnable.generate(input.prompt, { signal: abortSignal, tools });
                    if (!r.ok) {
                      throw new Error(r.error.message);
                    }
                    return r.output;
                  },
                });

          return [agentToolName, agentTool];
        }),
      )
    : {};

  return { ...tools, ...agentTools };
}

/**
 * Resolve the system prompt from config or override.
 */
export function resolveSystem<TInput>(
  system: string | ((params: { input: TInput }) => string) | undefined,
  input: TInput,
): string | undefined {
  if (system == null) {
    return undefined;
  }
  if (typeof system === "function") {
    return system({ input });
  }
  return system;
}

/**
 * Build the prompt/messages from input based on mode (typed vs simple).
 *
 * Returns a discriminated object: either `{ prompt }` or `{ messages }`,
 * never both — matching the AI SDK's `Prompt` union type.
 */
export function buildPrompt<TInput>(
  input: TInput,
  config: {
    input?: ZodType<TInput>;
    prompt?: (params: { input: TInput }) => string | Message[];
  },
): { prompt: string } | { messages: Message[] } {
  const hasInput = Boolean(config.input);
  const hasPrompt = Boolean(config.prompt);

  return match({ hasInput, hasPrompt })
    .with({ hasInput: true, hasPrompt: false }, () => {
      throw new Error(
        "Agent has `input` schema but no `prompt` function — both are required for typed mode",
      );
    })
    .with({ hasInput: false, hasPrompt: true }, () => {
      throw new Error(
        "Agent has `prompt` function but no `input` schema — both are required for typed mode",
      );
    })
    .with({ hasInput: true, hasPrompt: true }, () => {
      // config.prompt is guaranteed non-null by the match
      const promptFn = config.prompt as NonNullable<typeof config.prompt>;
      const built = promptFn({ input });
      return match(typeof built === "string")
        .with(true, () => ({ prompt: built as string }))
        .otherwise(() => ({ messages: built as Message[] }));
    })
    .otherwise(() =>
      match(typeof input === "string")
        .with(true, () => ({ prompt: input as string }))
        .otherwise(() => ({ messages: input as Message[] })),
    );
}

/**
 * Convert AI SDK's `LanguageModelUsage` to our flat `TokenUsage`.
 *
 * Maps nested `inputTokenDetails` / `outputTokenDetails` to flat
 * fields, resolving `undefined` → `0`.
 *
 * @param usage - The AI SDK usage object (from `totalUsage`).
 * @returns A resolved {@link TokenUsage} with all fields as numbers.
 */
export function toTokenUsage(usage: LanguageModelUsage): TokenUsage {
  const inputDetails = match(usage.inputTokenDetails)
    .with(P.nonNullable, (d) => ({
      cacheReadTokens: d.cacheReadTokens ?? 0,
      cacheWriteTokens: d.cacheWriteTokens ?? 0,
    }))
    .otherwise(() => ({ cacheReadTokens: 0, cacheWriteTokens: 0 }));

  const outputDetails = match(usage.outputTokenDetails)
    .with(P.nonNullable, (d) => ({
      reasoningTokens: d.reasoningTokens ?? 0,
    }))
    .otherwise(() => ({ reasoningTokens: 0 }));

  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    cacheReadTokens: inputDetails.cacheReadTokens,
    cacheWriteTokens: inputDetails.cacheWriteTokens,
    reasoningTokens: outputDetails.reasoningTokens,
  };
}
