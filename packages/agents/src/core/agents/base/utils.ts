import type { LanguageModelUsage } from "ai";
import { tool } from "ai";
import { isFunction, isNil, isNotNil } from "es-toolkit";
import { has } from "es-toolkit/compat";
import { match, P } from "ts-pattern";
import type { ZodType } from "zod";
import { z } from "zod";

import type { Agent, Message, Resolver } from "@/core/agents/base/types.js";
import type { TokenUsage } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import { RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";

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
  const hasTools = isNotNil(tools) && Object.keys(tools).length > 0;
  const hasAgents = isNotNil(agents) && Object.keys(agents).length > 0;

  if (!hasTools && !hasAgents) {
    return undefined;
  }

  // eslint-disable-next-line unicorn/prefer-ternary -- Cannot use ternary: no-ternary rule disallows ternary expressions
  const agentTools: Record<string, unknown> = (() => {
    if (agents) {
      return Object.fromEntries(
        Object.entries(agents).map(([name, runnable]) => {
          // eslint-disable-next-line security/detect-object-injection -- Symbol-keyed property access; symbols cannot be user-controlled
          const meta = (runnable as unknown as Record<symbol, unknown>)[RUNNABLE_META] as
            | RunnableMeta
            | undefined;
          const toolName = resolveToolName(meta, name);
          validateToolName(name);
          const agentToolName = `agent_${name}`;
          if (isNotNil(tools) && Object.hasOwn(tools, agentToolName)) {
            throw new Error(
              `Tool name collision: "${agentToolName}" already exists in tools. ` +
                `Rename sub-agent key "${name}" or the existing tool.`,
            );
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ToolSet requires `any` values; `unknown` breaks assignability with AI SDK
          const agentTool: ReturnType<typeof tool<any, any>> = (() => {
            // eslint-disable-next-line unicorn/prefer-ternary -- Cannot use ternary: no-ternary rule disallows ternary expressions
            if (isNotNil(meta) && isNotNil(meta.inputSchema)) {
              return tool({
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
            }
            return tool({
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
          })();

          return [agentToolName, agentTool];
        }),
      );
    }
    return {};
  })();

  return { ...tools, ...agentTools };
}

/**
 * Resolve a {@link Resolver} value — either return the static value
 * or call the resolver function with the validated input.
 *
 * Discriminates between resolver functions and LanguageModel objects
 * (which are also callable-shaped) by checking for the `doGenerate`
 * method that all AI SDK models expose.
 *
 * @param value - A static value or resolver function.
 * @param input - The validated agent input.
 * @returns The resolved value.
 */
export async function resolveValue<TInput, T>(
  value: Resolver<TInput, T>,
  input: TInput,
): Promise<T> {
  if (isFunction(value) && !has(value, "doGenerate")) {
    return (value as (params: { input: TInput }) => T | Promise<T>)({ input });
  }
  return value as T;
}

/**
 * Resolve an optional {@link Resolver} value.
 *
 * Returns `undefined` when the value is nil, otherwise delegates
 * to {@link resolveValue}.
 *
 * @param value - A static value, resolver function, or undefined.
 * @param input - The validated agent input.
 * @returns The resolved value or `undefined`.
 */
export async function resolveOptionalValue<TInput, T>(
  value: Resolver<TInput, T> | undefined,
  input: TInput,
): Promise<T | undefined> {
  if (isNil(value)) {
    return undefined;
  }
  return resolveValue(value, input);
}

/**
 * Build the prompt/messages from input based on mode (typed vs simple).
 *
 * Returns a discriminated object: either `{ prompt }` or `{ messages }`,
 * never both — matching the AI SDK's `Prompt` union type.
 * Supports async prompt functions.
 */
export async function buildPrompt<TInput>(
  input: TInput,
  config: {
    input?: ZodType<TInput>;
    prompt?: (params: { input: TInput }) => string | Message[] | Promise<string | Message[]>;
  },
): Promise<{ prompt: string } | { messages: Message[] }> {
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
    .with({ hasInput: true, hasPrompt: true }, async () => {
      // Config.prompt is guaranteed non-null by the match
      const promptFn = config.prompt as NonNullable<typeof config.prompt>;
      const built = await promptFn({ input });
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

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Pattern matching the universally safe tool-name subset accepted by
 * all major LLM providers (OpenAI, Anthropic, Google Gemini, Mistral).
 *
 * Must start with a letter or underscore, then letters, digits, or
 * underscores only — the strictest common denominator (Gemini).
 *
 * @private
 */
const SAFE_TOOL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a tool name is safe for all major LLM providers.
 *
 * Throws with a descriptive error if the name contains characters
 * that would be rejected by any provider (OpenAI, Anthropic, Gemini, Mistral).
 *
 * @param name - The tool name to validate.
 * @throws {Error} If the name contains unsupported characters.
 *
 * @private
 */
function validateToolName(name: string): void {
  if (SAFE_TOOL_NAME_RE.test(name)) {
    return;
  }

  const reasons: readonly string[] = match(name)
    .when(
      (n) => n.length === 0,
      () => ["name must not be empty"],
    )
    .otherwise((n) => {
      const invalidChars = [...new Set(n.replaceAll(/[a-zA-Z0-9_]/g, ""))].filter(
        (c) => c.length > 0,
      );

      return [
        ...match(/^[0-9]/.test(n))
          .with(true, () => [`must start with a letter or underscore, got "${n[0]}"`])
          .otherwise(() => []),
        ...match(invalidChars.length > 0)
          .with(true, () => [
            `invalid character(s): ${invalidChars.map((c) => `"${c}"`).join(", ")}`,
          ])
          .otherwise(() => []),
      ];
    });

  throw new Error(
    `Invalid sub-agent key "${name}": tool names must match /^[a-zA-Z_][a-zA-Z0-9_]*$/ ` +
      `to work across all LLM providers (OpenAI, Anthropic, Gemini, Mistral). ` +
      `${reasons.join("; ")}. ` +
      `Use camelCase (e.g. "myAgent") or snake_case (e.g. "my_agent") instead.`,
  );
}

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
  if (isNotNil(meta) && isNotNil(meta.name)) {
    return meta.name;
  }
  return fallback;
}
