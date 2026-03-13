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

import { GOOGLE_VERTEX_MODELS } from "../catalog/providers/google-vertex.js";
import type { ModelDefinition } from "../catalog/types.js";

/**
 * Known model identifiers for Google Vertex AI.
 *
 * @example
 * ```typescript
 * import type { GoogleVertexModelId } from '@funkai/models/google-vertex'
 *
 * const id: GoogleVertexModelId = 'gemini-embedding-001'
 * ```
 */
export type GoogleVertexModelId = (typeof GOOGLE_VERTEX_MODELS)[number]["id"];

/**
 * All Google Vertex AI models in the catalog.
 *
 * @example
 * ```typescript
 * import { googleVertexModels } from '@funkai/models/google-vertex'
 *
 * for (const m of googleVertexModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const googleVertexModels = GOOGLE_VERTEX_MODELS;

/**
 * Look up a Google Vertex AI model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { googleVertexModel } from '@funkai/models/google-vertex'
 *
 * const m = googleVertexModel('gemini-embedding-001')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function googleVertexModel(
  id: LiteralUnion<GoogleVertexModelId, string>,
): ModelDefinition | null {
  return GOOGLE_VERTEX_MODELS.find((m) => m.id === id) ?? null;
}
