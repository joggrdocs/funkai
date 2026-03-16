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
import { PERPLEXITY_MODELS } from '../catalog/providers/perplexity.js'

/**
 * Known model identifiers for Perplexity.
 *
 * @example
 * ```typescript
 * import type { PerplexityModelId } from '@funkai/models/perplexity'
 *
 * const id: PerplexityModelId = 'sonar-reasoning-pro'
 * ```
 */
export type PerplexityModelId = (typeof PERPLEXITY_MODELS)[number]['id']

/**
 * All Perplexity models in the catalog.
 *
 * @example
 * ```typescript
 * import { perplexityModels } from '@funkai/models/perplexity'
 *
 * for (const m of perplexityModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const perplexityModels = PERPLEXITY_MODELS

const MODEL_INDEX = new Map<string, ModelDefinition>(PERPLEXITY_MODELS.map((m) => [m.id, m]))

/**
 * Look up a Perplexity model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { perplexityModel } from '@funkai/models/perplexity'
 *
 * const m = perplexityModel('sonar-reasoning-pro')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function perplexityModel(id: LiteralUnion<PerplexityModelId, string>): ModelDefinition | null {
  return MODEL_INDEX.get(id) ?? null
}
