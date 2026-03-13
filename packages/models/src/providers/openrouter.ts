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
import { OPENROUTER_MODELS } from '../catalog/providers/openrouter.js'

/**
 * Known model identifiers for OpenRouter.
 */
export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[number]['id']

/**
 * All OpenRouter models in the catalog.
 *
 * @example
 * ```typescript
 * import { openRouterModels } from '@funkai/models/openrouter'
 *
 * for (const m of openRouterModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const openRouterModels = OPENROUTER_MODELS

/**
 * Look up a OpenRouter model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { openRouterModel } from '@funkai/models/openrouter'
 *
 * const m = openRouterModel('prime-intellect/intellect-3')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function openRouterModel(id: LiteralUnion<OpenRouterModelId, string>): ModelDefinition | null {
  return OPENROUTER_MODELS.find((m) => m.id === id) ?? null
}
