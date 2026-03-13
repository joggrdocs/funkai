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
import { MISTRAL_MODELS } from '../catalog/providers/mistral.js'

/**
 * Known model identifiers for Mistral.
 *
 * @example
 * ```typescript
 * import type { MistralModelId } from '@funkai/models/mistral'
 *
 * const id: MistralModelId = 'devstral-medium-2507'
 * ```
 */
export type MistralModelId = (typeof MISTRAL_MODELS)[number]['id']

/**
 * All Mistral models in the catalog.
 *
 * @example
 * ```typescript
 * import { mistralModels } from '@funkai/models/mistral'
 *
 * for (const m of mistralModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const mistralModels = MISTRAL_MODELS

/**
 * Look up a Mistral model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { mistralModel } from '@funkai/models/mistral'
 *
 * const m = mistralModel('devstral-medium-2507')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function mistralModel(id: LiteralUnion<MistralModelId, string>): ModelDefinition | null {
  return MISTRAL_MODELS.find((m) => m.id === id) ?? null
}
