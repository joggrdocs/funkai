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
export type ModelId = (typeof OPENROUTER_MODELS)[number]['id']

/**
 * All OpenRouter models in the catalog.
 */
export const models = OPENROUTER_MODELS

/**
 * Look up a OpenRouter model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function model(id: LiteralUnion<ModelId, string>): ModelDefinition | null {
  return OPENROUTER_MODELS.find((m) => m.id === id) ?? null
}
