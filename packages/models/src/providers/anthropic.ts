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
import { ANTHROPIC_MODELS } from '../catalog/providers/anthropic.js'

/**
 * Known model identifiers for Anthropic.
 */
export type AnthropicModelId = (typeof ANTHROPIC_MODELS)[number]['id']

/**
 * All Anthropic models in the catalog.
 *
 * @example
 * ```typescript
 * import { anthropicModels } from '@funkai/models/anthropic'
 *
 * for (const m of anthropicModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const anthropicModels = ANTHROPIC_MODELS

/**
 * Look up a Anthropic model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { anthropicModel } from '@funkai/models/anthropic'
 *
 * const m = anthropicModel('claude-opus-4-5-20251101')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function anthropicModel(id: LiteralUnion<AnthropicModelId, string>): ModelDefinition | null {
  return ANTHROPIC_MODELS.find((m) => m.id === id) ?? null
}
