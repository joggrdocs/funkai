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

import type { LiteralUnion } from 'type-fest'
import type { ModelDefinition } from '../catalog/types.js'
import { OPENAI_MODELS } from '../catalog/providers/openai.js'

/**
 * Known model identifiers for OpenAI.
 */
export type OpenAIModelId = (typeof OPENAI_MODELS)[number]['id']

/**
 * All OpenAI models in the catalog.
 */
export const openAIModels = OPENAI_MODELS

/**
 * Look up a OpenAI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function openAIModel(id: LiteralUnion<OpenAIModelId, string>): ModelDefinition | null {
  return OPENAI_MODELS.find((m) => m.id === id) ?? null
}
