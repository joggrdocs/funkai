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
import { TOGETHERAI_MODELS } from '../catalog/providers/togetherai.js'

/**
 * Known model identifiers for Together AI.
 *
 * @example
 * ```typescript
 * import type { TogetherModelId } from '@funkai/models/togetherai'
 *
 * const id: TogetherModelId = 'zai-org/GLM-4.6'
 * ```
 */
export type TogetherModelId = (typeof TOGETHERAI_MODELS)[number]['id']

/**
 * All Together AI models in the catalog.
 *
 * @example
 * ```typescript
 * import { togetherModels } from '@funkai/models/togetherai'
 *
 * for (const m of togetherModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const togetherModels = TOGETHERAI_MODELS

/**
 * Look up a Together AI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { togetherModel } from '@funkai/models/togetherai'
 *
 * const m = togetherModel('zai-org/GLM-4.6')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function togetherModel(id: LiteralUnion<TogetherModelId, string>): ModelDefinition | null {
  return TOGETHERAI_MODELS.find((m) => m.id === id) ?? null
}
