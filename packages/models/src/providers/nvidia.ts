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
 *
 * @example
 * ```typescript
 * import type { NvidiaModelId } from '@funkai/models/nvidia'
 *
 * const id: NvidiaModelId = 'nvidia/llama-3.1-nemotron-70b-instruct'
 * ```
 */
export type NvidiaModelId = (typeof NVIDIA_MODELS)[number]['id']

/**
 * All NVIDIA NIM models in the catalog.
 *
 * @example
 * ```typescript
 * import { nvidiaModels } from '@funkai/models/nvidia'
 *
 * for (const m of nvidiaModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const nvidiaModels = NVIDIA_MODELS

/**
 * Look up a NVIDIA NIM model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { nvidiaModel } from '@funkai/models/nvidia'
 *
 * const m = nvidiaModel('nvidia/llama-3.1-nemotron-70b-instruct')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function nvidiaModel(id: LiteralUnion<NvidiaModelId, string>): ModelDefinition | null {
  return NVIDIA_MODELS.find((m) => m.id === id) ?? null
}
