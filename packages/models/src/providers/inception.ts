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
import { INCEPTION_MODELS } from '../catalog/providers/inception.js'

/**
 * All Inception (Mercury) models in the catalog.
 */
export const models: readonly ModelDefinition[] = INCEPTION_MODELS

/**
 * Look up a Inception (Mercury) model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function model(id: string): ModelDefinition | null {
  return INCEPTION_MODELS.find((m) => m.id === id) ?? null
}
