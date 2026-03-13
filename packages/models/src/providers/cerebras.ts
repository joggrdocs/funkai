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

import type { ModelDefinition } from '../catalog/types.js'
import { CEREBRAS_MODELS } from '../catalog/providers/cerebras.js'

/**
 * All Cerebras models in the catalog.
 */
export const models: readonly ModelDefinition[] = CEREBRAS_MODELS

/**
 * Look up a Cerebras model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function model(id: string): ModelDefinition | null {
  return CEREBRAS_MODELS.find((m) => m.id === id) ?? null
}
