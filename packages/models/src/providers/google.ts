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
import { GOOGLE_MODELS } from '../catalog/providers/google.js'

/**
 * Known model identifiers for Google.
 */
export type GoogleModelId = (typeof GOOGLE_MODELS)[number]['id']

/**
 * All Google models in the catalog.
 *
 * @example
 * ```typescript
 * import { googleModels } from '@funkai/models/google'
 *
 * for (const m of googleModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const googleModels = GOOGLE_MODELS

/**
 * Look up a Google model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { googleModel } from '@funkai/models/google'
 *
 * const m = googleModel('gemini-embedding-001')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function googleModel(id: LiteralUnion<GoogleModelId, string>): ModelDefinition | null {
  return GOOGLE_MODELS.find((m) => m.id === id) ?? null
}
