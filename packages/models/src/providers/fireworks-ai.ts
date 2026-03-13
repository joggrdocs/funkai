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
import { FIREWORKS_AI_MODELS } from '../catalog/providers/fireworks-ai.js'

/**
 * Known model identifiers for Fireworks AI.
 */
export type FireworksModelId = (typeof FIREWORKS_AI_MODELS)[number]['id']

/**
 * All Fireworks AI models in the catalog.
 */
export const fireworksModels = FIREWORKS_AI_MODELS

/**
 * Look up a Fireworks AI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function fireworksModel(id: LiteralUnion<FireworksModelId, string>): ModelDefinition | null {
  return FIREWORKS_AI_MODELS.find((m) => m.id === id) ?? null
}
