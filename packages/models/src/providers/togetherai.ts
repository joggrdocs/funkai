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
import { TOGETHERAI_MODELS } from '../catalog/providers/togetherai.js'

/**
 * Known model identifiers for Together AI.
 */
export type ModelId = (typeof TOGETHERAI_MODELS)[number]['id']

/**
 * All Together AI models in the catalog.
 */
export const models = TOGETHERAI_MODELS

/**
 * Look up a Together AI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function model(id: LiteralUnion<ModelId, string>): ModelDefinition | null {
  return TOGETHERAI_MODELS.find((m) => m.id === id) ?? null
}
