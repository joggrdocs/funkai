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
import { COHERE_MODELS } from '../catalog/providers/cohere.js'

/**
 * Known model identifiers for Cohere.
 *
 * @example
 * ```typescript
 * import type { CohereModelId } from '@funkai/models/cohere'
 *
 * const id: CohereModelId = 'c4ai-aya-expanse-32b'
 * ```
 */
export type CohereModelId = (typeof COHERE_MODELS)[number]['id']

/**
 * All Cohere models in the catalog.
 *
 * @example
 * ```typescript
 * import { cohereModels } from '@funkai/models/cohere'
 *
 * for (const m of cohereModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const cohereModels = COHERE_MODELS

/**
 * Look up a Cohere model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { cohereModel } from '@funkai/models/cohere'
 *
 * const m = cohereModel('c4ai-aya-expanse-32b')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function cohereModel(id: LiteralUnion<CohereModelId, string>): ModelDefinition | null {
  return COHERE_MODELS.find((m) => m.id === id) ?? null
}
