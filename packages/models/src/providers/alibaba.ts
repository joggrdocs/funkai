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
 */
export type AlibabaModelId = (typeof ALIBABA_MODELS)[number]['id']

/**
 * All Alibaba (Qwen) models in the catalog.
 */
export const alibabaModels = ALIBABA_MODELS

/**
 * Look up a Alibaba (Qwen) model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function alibabaModel(id: LiteralUnion<AlibabaModelId, string>): ModelDefinition | null {
  return ALIBABA_MODELS.find((m) => m.id === id) ?? null
}
