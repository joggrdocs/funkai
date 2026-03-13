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
import { AMAZON_BEDROCK_MODELS } from '../catalog/providers/amazon-bedrock.js'

/**
 * All Amazon Bedrock models in the catalog.
 */
export const models: readonly ModelDefinition[] = AMAZON_BEDROCK_MODELS

/**
 * Look up a Amazon Bedrock model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 */
export function model(id: string): ModelDefinition | null {
  return AMAZON_BEDROCK_MODELS.find((m) => m.id === id) ?? null
}
