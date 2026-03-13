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
import { ALIBABA_MODELS } from '../catalog/providers/alibaba.js'

/**
 * Known model identifiers for Alibaba (Qwen).
 *
 * @example
 * ```typescript
 * import type { AlibabaModelId } from '@funkai/models/alibaba'
 *
 * const id: AlibabaModelId = 'qwen-vl-plus'
 * ```
 */
export type AlibabaModelId = (typeof ALIBABA_MODELS)[number]['id']

/**
 * All Alibaba (Qwen) models in the catalog.
 *
 * @example
 * ```typescript
 * import { alibabaModels } from '@funkai/models/alibaba'
 *
 * for (const m of alibabaModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const alibabaModels = ALIBABA_MODELS

/**
 * Look up an Alibaba (Qwen) model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { alibabaModel } from '@funkai/models/alibaba'
 *
 * const m = alibabaModel('qwen-vl-plus')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function alibabaModel(id: LiteralUnion<AlibabaModelId, string>): ModelDefinition | null {
  return ALIBABA_MODELS.find((m) => m.id === id) ?? null
}
