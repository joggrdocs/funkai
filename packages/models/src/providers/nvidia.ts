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
import { NVIDIA_MODELS } from '../catalog/providers/nvidia.js'

/**
 * Known model identifiers for NVIDIA NIM.
 */
export type ModelId = (typeof NVIDIA_MODELS)[number]['id']

/**
 * All NVIDIA NIM models in the catalog.
 */
export const models = NVIDIA_MODELS

/**
 * Look up a NVIDIA NIM model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function model(id: LiteralUnion<ModelId, string>): ModelDefinition | null {
  return NVIDIA_MODELS.find((m) => m.id === id) ?? null
}
