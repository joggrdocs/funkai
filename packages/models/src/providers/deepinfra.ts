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

import { DEEPINFRA_MODELS } from "../catalog/providers/deepinfra.js";
import type { ModelDefinition } from "../catalog/types.js";

/**
 * Known model identifiers for DeepInfra.
 *
 * @example
 * ```typescript
 * import type { DeepInfraModelId } from '@funkai/models/deepinfra'
 *
 * const id: DeepInfraModelId = 'zai-org/GLM-4.7-Flash'
 * ```
 */
export type DeepInfraModelId = (typeof DEEPINFRA_MODELS)[number]["id"];

/**
 * All DeepInfra models in the catalog.
 *
 * @example
 * ```typescript
 * import { deepInfraModels } from '@funkai/models/deepinfra'
 *
 * for (const m of deepInfraModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const deepInfraModels = DEEPINFRA_MODELS;

/**
 * Look up a DeepInfra model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { deepInfraModel } from '@funkai/models/deepinfra'
 *
 * const m = deepInfraModel('zai-org/GLM-4.7-Flash')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function deepInfraModel(id: LiteralUnion<DeepInfraModelId, string>): ModelDefinition | null {
  return DEEPINFRA_MODELS.find((m) => m.id === id) ?? null;
}
