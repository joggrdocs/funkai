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
import { CEREBRAS_MODELS } from '../catalog/providers/cerebras.js'

/**
 * Known model identifiers for Cerebras.
 */
export type CerebrasModelId = (typeof CEREBRAS_MODELS)[number]['id']

/**
 * All Cerebras models in the catalog.
 *
 * @example
 * ```typescript
 * import { cerebrasModels } from '@funkai/models/cerebras'
 *
 * for (const m of cerebrasModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const cerebrasModels = CEREBRAS_MODELS

/**
 * Look up a Cerebras model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { cerebrasModel } from '@funkai/models/cerebras'
 *
 * const m = cerebrasModel('qwen-3-235b-a22b-instruct-2507')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function cerebrasModel(id: LiteralUnion<CerebrasModelId, string>): ModelDefinition | null {
  return CEREBRAS_MODELS.find((m) => m.id === id) ?? null
}
