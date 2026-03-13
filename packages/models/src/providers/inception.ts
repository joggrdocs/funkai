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
import { INCEPTION_MODELS } from '../catalog/providers/inception.js'

/**
 * Known model identifiers for Inception (Mercury).
 *
 * @example
 * ```typescript
 * import type { InceptionModelId } from '@funkai/models/inception'
 *
 * const id: InceptionModelId = 'mercury-2'
 * ```
 */
export type InceptionModelId = (typeof INCEPTION_MODELS)[number]['id']

/**
 * All Inception (Mercury) models in the catalog.
 *
 * @example
 * ```typescript
 * import { inceptionModels } from '@funkai/models/inception'
 *
 * for (const m of inceptionModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const inceptionModels = INCEPTION_MODELS

/**
 * Look up an Inception (Mercury) model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { inceptionModel } from '@funkai/models/inception'
 *
 * const m = inceptionModel('mercury-2')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function inceptionModel(id: LiteralUnion<InceptionModelId, string>): ModelDefinition | null {
  return INCEPTION_MODELS.find((m) => m.id === id) ?? null
}
