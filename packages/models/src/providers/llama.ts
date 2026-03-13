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
import { LLAMA_MODELS } from '../catalog/providers/llama.js'

/**
 * Known model identifiers for Meta Llama.
 */
export type LlamaModelId = (typeof LLAMA_MODELS)[number]['id']

/**
 * All Meta Llama models in the catalog.
 *
 * @example
 * ```typescript
 * import { llamaModels } from '@funkai/models/llama'
 *
 * for (const m of llamaModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const llamaModels = LLAMA_MODELS

/**
 * Look up a Meta Llama model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { llamaModel } from '@funkai/models/llama'
 *
 * const m = llamaModel('cerebras-llama-4-maverick-17b-128e-instruct')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function llamaModel(id: LiteralUnion<LlamaModelId, string>): ModelDefinition | null {
  return LLAMA_MODELS.find((m) => m.id === id) ?? null
}
