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
import { XAI_MODELS } from '../catalog/providers/xai.js'

/**
 * Known model identifiers for xAI.
 *
 * @example
 * ```typescript
 * import type { XAIModelId } from '@funkai/models/xai'
 *
 * const id: XAIModelId = 'grok-2-1212'
 * ```
 */
export type XAIModelId = (typeof XAI_MODELS)[number]['id']

/**
 * All xAI models in the catalog.
 *
 * @example
 * ```typescript
 * import { xAIModels } from '@funkai/models/xai'
 *
 * for (const m of xAIModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const xAIModels = XAI_MODELS

const MODEL_INDEX = new Map<string, ModelDefinition>(XAI_MODELS.map((m) => [m.id, m]))

/**
 * Look up a xAI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { xAIModel } from '@funkai/models/xai'
 *
 * const m = xAIModel('grok-2-1212')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function xAIModel(id: LiteralUnion<XAIModelId, string>): ModelDefinition | null {
  return MODEL_INDEX.get(id) ?? null
}
