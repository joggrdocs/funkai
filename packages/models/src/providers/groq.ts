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
import { GROQ_MODELS } from '../catalog/providers/groq.js'

/**
 * Known model identifiers for Groq.
 */
export type GroqModelId = (typeof GROQ_MODELS)[number]['id']

/**
 * All Groq models in the catalog.
 */
export const groqModels = GROQ_MODELS

/**
 * Look up a Groq model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function groqModel(id: LiteralUnion<GroqModelId, string>): ModelDefinition | null {
  return GROQ_MODELS.find((m) => m.id === id) ?? null
}
