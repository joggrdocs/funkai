import type { LanguageModelUsage } from "ai";
import { tool } from "ai";
import { match, P } from "ts-pattern";
import type { ZodType } from "zod";
import { z } from "zod";

import type { Agent, Message } from "@/core/agents/base/types.js";
import { openrouter } from "@/core/provider/provider.js";
import type { LanguageModel, TokenUsage } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type { Model } from "@/core/types.js";
import { RUNNABLE_META, type RunnableMeta } from "@/lib/runnable.js";

function resolveToolName(meta: RunnableMeta | undefined, fallback: string): string {
  if (meta != null && meta.name != null) {
    return meta.name;
  }
  return fallback;
}

/**
 * Resolve a {@link Model} to an AI SDK `LanguageModel`.
 */
export function resolveModel(ref: Model): LanguageModel {
  if (typeof ref === "string") {
    return openrouter(ref);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildAITools(
  tools?: Record<string, Tool>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agents?: Record<string, Agent<any, any, any, any>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  const hasInitialTools = tools != null && Object.keys(tools).length > 0;

  if (tools) {
    Object.assign(result, tools);
  }

  if (agents) {
    for (const [name, runnable] of Object.entries(agents)) {
      // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
      const meta = (runnable as unknown as Record<symbol, unknown>)[RUNNABLE_META] as
        | RunnableMeta
        | undefined;
      const toolName = resolveToolName(meta, name);

      const agentToolName = `agent:${name}`;

      if (meta != null && meta.inputSchema != null) {
        // eslint-disable-next-line security/detect-object-injection -- Key from Object.entries iteration, not user input
        result[agentToolName] = tool({
          description: `Delegate to ${toolName}`,
          inputSchema: meta.inputSchema,
          execute: async (input, { abortSignal }) => {
            const r = await runnable.generate(input, { signal: abortSignal, tools });
            if (!r.ok) {
              throw new Error(r.error.message);
            }
            return r.output;
          },
        });
      } else {
        // eslint-disable-next-line security/detect-object-injection -- Key from Object.entries iteration, not user input
        result[agentToolName] = tool({
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
      }
    }
  }

  const hasAgents = agents != null && Object.keys(agents).length > 0;
  if (hasInitialTools || hasAgents) {
    return result;
  }
  return undefined;
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
