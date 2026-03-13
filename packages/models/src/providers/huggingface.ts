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
 */
export const huggingFaceModels = HUGGINGFACE_MODELS

/**
 * Look up a Hugging Face model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function huggingFaceModel(id: LiteralUnion<HuggingFaceModelId, string>): ModelDefinition | null {
  return HUGGINGFACE_MODELS.find((m) => m.id === id) ?? null
}
