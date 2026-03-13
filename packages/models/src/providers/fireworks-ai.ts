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
 *
 * @example
 * ```typescript
 * import { fireworksModels } from '@funkai/models/fireworks-ai'
 *
 * for (const m of fireworksModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const fireworksModels = FIREWORKS_AI_MODELS

/**
 * Look up a Fireworks AI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { fireworksModel } from '@funkai/models/fireworks-ai'
 *
 * const m = fireworksModel('accounts/fireworks/models/kimi-k2-instruct')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function fireworksModel(id: LiteralUnion<FireworksModelId, string>): ModelDefinition | null {
  return FIREWORKS_AI_MODELS.find((m) => m.id === id) ?? null
}
