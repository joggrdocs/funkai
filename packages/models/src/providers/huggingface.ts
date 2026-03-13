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
import { HUGGINGFACE_MODELS } from '../catalog/providers/huggingface.js'

/**
 * Known model identifiers for Hugging Face.
 */
export type HuggingFaceModelId = (typeof HUGGINGFACE_MODELS)[number]['id']

/**
 * All Hugging Face models in the catalog.
 *
 * @example
 * ```typescript
 * import { huggingFaceModels } from '@funkai/models/huggingface'
 *
 * for (const m of huggingFaceModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const huggingFaceModels = HUGGINGFACE_MODELS

/**
 * Look up a Hugging Face model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { huggingFaceModel } from '@funkai/models/huggingface'
 *
 * const m = huggingFaceModel('zai-org/GLM-4.7-Flash')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function huggingFaceModel(id: LiteralUnion<HuggingFaceModelId, string>): ModelDefinition | null {
  return HUGGINGFACE_MODELS.find((m) => m.id === id) ?? null
}
