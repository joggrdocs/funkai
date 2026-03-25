import { privateField } from "@funkai/utils";
import type { LanguageModelUsage } from "ai";
import { tool } from "ai";
import { isFunction, isNil, isNotNil, isString, omitBy } from "es-toolkit";
import { match, P } from "ts-pattern";
import type { ZodType } from "zod";
import { z } from "zod";

import type { Agent, Message, Resolver } from "@/core/agents/types.js";
import type { Logger } from "@/core/logger.js";
import type { TokenUsage } from "@/core/provider/types.js";
import type { Tool } from "@/core/tool.js";
import type { AgentChainEntry, StepFinishEvent, StepInfo } from "@/core/types.js";
import { RUNNABLE_META } from "@/lib/runnable.js";
import type { RunnableMeta } from "@/lib/runnable.js";

/**
 * Context forwarded from a parent agent to sub-agents wrapped as tools.
 *
 * Includes the parent's logger and **fixed-type** lifecycle hooks so that
 * sub-agent internal step activity is visible to the parent.
 *
 * ## Why only step hooks are forwarded
 *
 * `onStepStart` and `onStepFinish` use fixed event types (`StepInfo`,
 * `StepFinishEvent`) that are the same for every agent — safe to pass
 * from parent to child with no type mismatch.
 *
 * `onStart`, `onFinish`, and `onError` are **not** forwarded because their
 * event types are generic over `TInput`/`TOutput`. A parent agent typed
 * `Agent<{ userId: string }, ...>` would have `onStart: (e: { input: { userId: string } }) => void`,
 * but the sub-agent's input is a completely different type (e.g.
 * `{ query: string }`). Forwarding the parent's hook to the child would
 * cause the hook to receive the wrong event shape at runtime — a silent
 * type-safety violation that the compiler cannot catch.
 *
 * Sub-agent activity is still observable at the parent level through
 * `onStepFinish`, which fires for each tool-loop step including sub-agent
 * tool calls.
 *
 * ## Lifecycle (what gets passed down vs. what stays at the parent)
 *
 * ```
 * Passed into child.generate() — fixed types, safe:
 *   log          → child creates .child({ agentId }) from it
 *   onStepStart  → StepInfo (same shape for all agents)
 *   onStepFinish → StepFinishEvent (same shape for all agents)
 *
 * NOT passed down — generic types, would break type safety:
 *   onStart      → { input: TInput } (differs per agent)
 *   onFinish     → { input: TInput, result: GenerateResult<TOutput> } (differs per agent)
 *   onError      → { input: TInput, error: Error } (differs per agent)
 * ```
 */
export interface ParentAgentContext {
  /** Parent logger — sub-agent creates `.child({ agentId })` from it. */
  log?: Logger;

  /**
   * Fires when a sub-agent step starts.
   *
   * Uses `StepInfo` — a fixed (non-generic) type, safe to forward.
   */
  onStepStart?: (event: { step: StepInfo }) => void | Promise<void>;

  /**
   * Fires when a sub-agent step finishes.
   *
   * Uses `StepFinishEvent` — a fixed (non-generic) type, safe to forward.
   */
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;

  /**
   * Agent ancestry chain from root to the current agent.
   *
   * @internal Framework-only — not exposed on public `GenerateParams`.
   */
  agentChain?: readonly AgentChainEntry[];
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
 *
 * @param tools - Record of named tools to include.
 * @param agents - Record of named sub-agents to wrap as tools.
 * @param parentCtx - Parent context forwarded to sub-agent generate calls
 *   (logger, lifecycle hooks).
 * @returns The merged tool set, or `undefined` when empty.
 */
export function buildAITools(
  tools?: Record<string, Tool>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Agent generic params are contravariant; `unknown` breaks assignability
  agents?: Record<string, Agent<any, any, any, any, any>>,
  parentCtx?: ParentAgentContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ToolSet requires `any` values; `unknown` breaks assignability with AI SDK
): Record<string, any> | undefined {
  const hasTools = isNotNil(tools) && Object.keys(tools).length > 0;
  const hasAgents = isNotNil(agents) && Object.keys(agents).length > 0;

  if (!hasTools && !hasAgents) {
    return undefined;
  }

  const agentTools: Record<string, unknown> = buildAgentTools(agents, tools, parentCtx);

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
  if (isFunction(value) && !Object.hasOwn(value, "doGenerate")) {
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
 *
 * @param input - The agent input value.
 * @param config - Agent config containing optional input schema and prompt function.
 * @returns Either `{ prompt }` or `{ messages }` for the AI SDK.
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
      return match(isString(built))
        .with(true, () => ({ prompt: built as string }))
        .otherwise(() => ({ messages: built as Message[] }));
    })
    .otherwise(() =>
      match(isString(input))
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

/**
 * Build a record of AI SDK tools from sub-agent runnables.
 *
 * @private
 */
function buildAgentTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Agent generic params are contravariant; `unknown` breaks assignability
  agents: Record<string, Agent<any, any, any, any, any>> | undefined,
  tools: Record<string, Tool> | undefined,
  parentCtx: ParentAgentContext | undefined,
): Record<string, unknown> {
  if (!agents) {
    return {};
  }
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
      const agentTool: ReturnType<typeof tool<any, any>> = buildAgentTool(
        runnable,
        meta,
        toolName,
        tools,
        parentCtx,
      );

      return [agentToolName, agentTool];
    }),
  );
}

/**
 * Create an AI SDK tool wrapping a single sub-agent runnable.
 *
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ToolSet requires `any` values; `unknown` breaks assignability with AI SDK
function buildAgentTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Agent generic params are contravariant; `unknown` breaks assignability
  runnable: Agent<any, any, any, any, any>,
  meta: RunnableMeta | undefined,
  toolName: string,
  tools: Record<string, Tool> | undefined,
  parentCtx: ParentAgentContext | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ToolSet requires `any` values; `unknown` breaks assignability with AI SDK
): ReturnType<typeof tool<any, any>> {
  const parentParams = buildParentParams(parentCtx);
  let parentChain: readonly AgentChainEntry[] | undefined;
  if (isNotNil(parentCtx)) {
    parentChain = parentCtx.agentChain;
  }

  if (isNotNil(meta) && isNotNil(meta.inputSchema)) {
    return tool({
      description: `Delegate to ${toolName}`,
      inputSchema: meta.inputSchema,
      execute: async (input, { abortSignal }) => {
        const generateParams = {
          input,
          signal: abortSignal,
          tools,
          ...parentParams,
        };
        // Stamp after spread — Symbol fields don't survive spread
        if (isNotNil(parentChain)) {
          _agentChainField.set(generateParams, parentChain);
        }
        const r = await runnable.generate(generateParams);
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
      const generateParams = {
        prompt: input.prompt,
        signal: abortSignal,
        tools,
        ...parentParams,
      };
      if (isNotNil(parentChain)) {
        _agentChainField.set(generateParams, parentChain);
      }
      const r = await runnable.generate(generateParams);
      if (!r.ok) {
        throw new Error(r.error.message);
      }
      return r.output;
    },
  });
}

/**
 * Private field for transporting agent ancestry chain through params.
 *
 * Uses a Symbol key so it is invisible to `Object.keys()`,
 * `JSON.stringify()`, `for...in`, and object spread.
 *
 * @internal
 */
export const _agentChainField = privateField<readonly AgentChainEntry[]>("funkai:agent-chain");

/**
 * Shared empty chain — avoids allocating a new `[]` on every
 * top-level agent call where no parent chain exists.
 *
 * @private
 */
const EMPTY_CHAIN: readonly AgentChainEntry[] = [];

/**
 * Extract the internal `agentChain` from raw generate params.
 *
 * Reads the agent chain from a Symbol-keyed private field on
 * the params object. Returns an empty array when absent.
 *
 * @param params - The raw generate params object.
 * @returns The agent chain array, or an empty array if absent.
 *
 * @example
 * ```ts
 * const chain = extractAgentChain(params);
 * // => [{ id: "root" }] or []
 * ```
 */
export function extractAgentChain(params: unknown): readonly AgentChainEntry[] {
  if (typeof params !== "object" || params === null) {
    return EMPTY_CHAIN;
  }
  return _agentChainField.get(params, EMPTY_CHAIN);
}

/**
 * Build the per-call params to forward from parent context to sub-agent.
 *
 * Only forwards the parent logger and **fixed-type** step hooks.
 * Generic hooks (`onStart`, `onFinish`, `onError`) are intentionally
 * excluded — see {@link ParentAgentContext} for the rationale.
 *
 * Omits `undefined` values so they don't override sub-agent defaults.
 *
 * @private
 */
function buildParentParams(ctx: ParentAgentContext | undefined): Record<string, unknown> {
  if (isNil(ctx)) {
    return {};
  }
  return omitBy(
    {
      logger: ctx.log,
      onStepStart: ctx.onStepStart,
      onStepFinish: ctx.onStepFinish,
    },
    isNil,
  );
}
