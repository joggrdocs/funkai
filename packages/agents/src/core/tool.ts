import { tool as aiTool, zodSchema } from "ai";
import { isFunction, isNil } from "es-toolkit";
import { has, isObject } from "es-toolkit/compat";
import { P, match } from "ts-pattern";
import type { ZodType } from "zod";

/**
 * Configuration for creating a tool.
 *
 * @typeParam TInput - Input type, inferred from the `inputSchema` Zod schema.
 * @typeParam TOutput - Output type, inferred from the `execute` return.
 */
export interface ToolConfig<TInput, TOutput> {
  /**
   * Human-readable description of what the tool does.
   *
   * Shown to the model alongside the tool name. A good description
   * helps the model decide when and how to call the tool.
   */
  description: string;

  /**
   * Display title for the tool.
   *
   * Optional human-readable title shown in UIs and logs.
   */
  title?: string;

  /**
   * Zod schema for validating and typing tool input.
   *
   * The schema is serialized to JSON Schema and sent to the model.
   * Input from the model is validated against it before `execute`
   * is called.
   */
  inputSchema: ZodType<TInput>;

  /**
   * Zod schema for validating tool output.
   *
   * When provided, the return value of `execute` is validated
   * against this schema before being sent back to the model.
   */
  outputSchema?: ZodType<TOutput>;

  /**
   * Example inputs to guide the model.
   *
   * Helps the model understand expected input structure. Natively
   * supported by Anthropic; for other providers, use
   * `addToolInputExamplesMiddleware` to inject examples into the
   * tool description.
   */
  inputExamples?: Array<{ input: TInput }>;

  /**
   * Execute the tool with validated input.
   *
   * Called by the framework after the model requests a tool call and
   * the input passes schema validation.
   *
   * @param input - The validated tool input.
   * @returns The tool output returned to the model.
   */
  execute: (input: TInput) => Promise<TOutput>;
}

/**
 * A tool instance — the return type of `tool()` / `ai.tool()`.
 *
 * @typeParam TInput - Tool input type.
 * @typeParam TOutput - Tool output type.
 */
export type Tool<TInput = unknown, TOutput = unknown> = ReturnType<typeof aiTool<TInput, TOutput>>;

/**
 * Create a tool for AI agent function calling.
 *
 * Wraps the AI SDK's `tool()` helper. The `inputSchema` (and optional
 * `outputSchema`) are wrapped via `zodSchema()` so the AI SDK can
 * convert them to JSON Schema and validate model I/O at runtime.
 *
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/tool
 *
 * @example
 * ```typescript
 * const fetchPage = tool({
 *   description: 'Fetch the contents of a web page by URL',
 *   inputSchema: z.object({
 *     url: z.url(),
 *   }),
 *   execute: async ({ url }) => {
 *     const res = await fetch(url)
 *     return {
 *       url,
 *       status: res.status,
 *       body: await res.text(),
 *     }
 *   },
 * })
 * ```
 */
export function tool<TInput, TOutput>(config: ToolConfig<TInput, TOutput>): Tool<TInput, TOutput> {
  const resolvedOutputSchema = resolveOutputSchema(config.outputSchema);
  const result = {
    description: config.description,
    title: config.title,
    inputSchema: zodSchema(config.inputSchema),
    outputSchema: resolvedOutputSchema,
    inputExamples: config.inputExamples,
    execute: async (data: TInput) => config.execute(data),
  };
  assertTool<TInput, TOutput>(result);
  return aiTool(result);
}

/**
 * Resolve an optional Zod output schema into a zodSchema-wrapped value.
 *
 * @private
 */
function resolveOutputSchema<TOutput>(
  schema: ZodType<TOutput> | undefined,
): ReturnType<typeof zodSchema> | undefined {
  return match(schema)
    .with(P.nullish, () => undefined)
    .otherwise((value) => zodSchema(value));
}

/**
 * Runtime assertion that narrows `value` to `Tool<TInput, TOutput>`.
 *
 * Validates structural shape at runtime — `inputSchema` is present and
 * `execute` is a function. Generic type parameters (`TInput`, `TOutput`)
 * are erased at runtime, so only the structural shape can be verified.
 *
 * This assertion exists because TypeScript cannot evaluate the AI SDK's
 * `NeverOptional<TOutput>` conditional type when `TOutput` is an
 * unresolved generic — a known limitation with higher-order conditional
 * types. Using `asserts` is TypeScript's endorsed narrowing mechanism
 * and provides a runtime safety net if the AI SDK's tool shape changes.
 *
 * @private
 */
function assertTool<TInput, TOutput>(value: unknown): asserts value is Tool<TInput, TOutput> {
  if (isNil(value) || !isObject(value)) {
    throw new TypeError("Expected tool to be an object");
  }

  if (!has(value, "inputSchema")) {
    throw new TypeError("Tool is missing required property: inputSchema");
  }

  if (!has(value, "execute") || !isFunction(value.execute)) {
    throw new TypeError("Tool is missing required property: execute");
  }
}
