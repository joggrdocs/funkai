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
 */
export const anthropicModels = ANTHROPIC_MODELS

/**
 * Look up a Anthropic model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function anthropicModel(id: LiteralUnion<AnthropicModelId, string>): ModelDefinition | null {
  return ANTHROPIC_MODELS.find((m) => m.id === id) ?? null
}
