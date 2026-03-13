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
import { DEEPSEEK_MODELS } from '../catalog/providers/deepseek.js'

/**
 * Known model identifiers for DeepSeek.
 *
 * @example
 * ```typescript
 * import type { DeepSeekModelId } from '@funkai/models/deepseek'
 *
 * const id: DeepSeekModelId = 'deepseek-reasoner'
 * ```
 */
export type DeepSeekModelId = (typeof DEEPSEEK_MODELS)[number]['id']

/**
 * All DeepSeek models in the catalog.
 *
 * @example
 * ```typescript
 * import { deepSeekModels } from '@funkai/models/deepseek'
 *
 * for (const m of deepSeekModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const deepSeekModels = DEEPSEEK_MODELS

/**
 * Look up a DeepSeek model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { deepSeekModel } from '@funkai/models/deepseek'
 *
 * const m = deepSeekModel('deepseek-reasoner')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function deepSeekModel(id: LiteralUnion<DeepSeekModelId, string>): ModelDefinition | null {
  return DEEPSEEK_MODELS.find((m) => m.id === id) ?? null
}
