// ──────────────────────────────────────────────────────────────
// ███████╗██╗   ██╗███╗   ██╗██╗  ██╗ █████╗ ██╗
// ██╔════╝██║   ██║████╗  ██║██║ ██╔╝██╔══██╗██║
// █████╗  ██║   ██║██╔██╗ ██║█████╔╝ ███████║██║
// ██╔══╝  ██║   ██║██║╚██╗██║██╔═██╗ ██╔══██║██║
// ██║     ╚██████╔╝██║ ╚████║██║  ██╗██║  ██║██║
// ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝
//
// AUTO-GENERATED — DO NOT EDIT
// Source: https://models.dev
// Update: pnpm --filter=@funkai/models generate:models
// ──────────────────────────────────────────────────────────────

import type { LiteralUnion } from "type-fest";

import { OPENAI_MODELS } from "../catalog/providers/openai.js";
import type { ModelDefinition } from "../catalog/types.js";

/**
 * Known model identifiers for OpenAI.
 *
 * @example
 * ```typescript
 * import type { OpenAIModelId } from '@funkai/models/openai'
 *
 * const id: OpenAIModelId = 'gpt-4o-2024-11-20'
 * ```
 */
export type OpenAIModelId = (typeof OPENAI_MODELS)[number]["id"];

/**
 * All OpenAI models in the catalog.
 *
 * @example
 * ```typescript
 * import { openAIModels } from '@funkai/models/openai'
 *
 * for (const m of openAIModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const openAIModels = OPENAI_MODELS;

/**
 * Look up an OpenAI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { openAIModel } from '@funkai/models/openai'
 *
 * const m = openAIModel('gpt-4o-2024-11-20')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function openAIModel(id: LiteralUnion<OpenAIModelId, string>): ModelDefinition | null {
  return OPENAI_MODELS.find((m) => m.id === id) ?? null;
}
