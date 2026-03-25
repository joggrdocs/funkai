import type { LanguageModelUsage } from "ai";
import type { ModelId } from "@funkai/models";

export type { LanguageModel } from "@funkai/models";

/**
 * Raw tracking record from a single AI model invocation.
 *
 * Extends `LanguageModelUsage` from the AI SDK with model identity and
 * framework source metadata. All token fields are `number | undefined`
 * because providers may not report all fields.
 */
export interface TokenUsageRecord extends LanguageModelUsage {
  /**
   * The model identifier that produced this usage
   * (e.g. `"openai/gpt-5.2-codex"`).
   */
  readonly modelId: ModelId;

  /**
   * Populated by the framework — identifies which component produced this usage.
   */
  readonly source?: {
    readonly workflowId?: string;
    readonly stepId?: string;
    readonly agentId: string;
    readonly scope: readonly string[];
  };
}
