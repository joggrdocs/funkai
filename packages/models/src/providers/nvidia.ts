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
export type NvidiaModelId = (typeof NVIDIA_MODELS)[number]['id']

/**
 * All NVIDIA NIM models in the catalog.
 */
export const nvidiaModels = NVIDIA_MODELS

/**
 * Look up a NVIDIA NIM model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function nvidiaModel(id: LiteralUnion<NvidiaModelId, string>): ModelDefinition | null {
  return NVIDIA_MODELS.find((m) => m.id === id) ?? null
}
