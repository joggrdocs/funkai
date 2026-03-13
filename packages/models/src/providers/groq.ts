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

import type { LiteralUnion } from "type-fest";

import { GROQ_MODELS } from "../catalog/providers/groq.js";
import type { ModelDefinition } from "../catalog/types.js";

/**
 * Known model identifiers for Groq.
 *
 * @example
 * ```typescript
 * import type { GroqModelId } from '@funkai/models/groq'
 *
 * const id: GroqModelId = 'llama3-70b-8192'
 * ```
 */
export type GroqModelId = (typeof GROQ_MODELS)[number]["id"];

/**
 * All Groq models in the catalog.
 *
 * @example
 * ```typescript
 * import { groqModels } from '@funkai/models/groq'
 *
 * for (const m of groqModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const groqModels = GROQ_MODELS;

/**
 * Look up a Groq model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { groqModel } from '@funkai/models/groq'
 *
 * const m = groqModel('llama3-70b-8192')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function groqModel(id: LiteralUnion<GroqModelId, string>): ModelDefinition | null {
  return GROQ_MODELS.find((m) => m.id === id) ?? null;
}
