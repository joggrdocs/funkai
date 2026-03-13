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
import { AMAZON_BEDROCK_MODELS } from '../catalog/providers/amazon-bedrock.js'

/**
 * Known model identifiers for Amazon Bedrock.
 *
 * @example
 * ```typescript
 * import type { AmazonBedrockModelId } from '@funkai/models/amazon-bedrock'
 *
 * const id: AmazonBedrockModelId = 'deepseek.r1-v1:0'
 * ```
 */
export type AmazonBedrockModelId = (typeof AMAZON_BEDROCK_MODELS)[number]['id']

/**
 * All Amazon Bedrock models in the catalog.
 *
 * @example
 * ```typescript
 * import { amazonBedrockModels } from '@funkai/models/amazon-bedrock'
 *
 * for (const m of amazonBedrockModels) {
 *   console.log(m.id, m.pricing.input)
 * }
 * ```
 */
export const amazonBedrockModels = AMAZON_BEDROCK_MODELS

/**
 * Look up an Amazon Bedrock model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or `null`.
 *
 * @example
 * ```typescript
 * import { amazonBedrockModel } from '@funkai/models/amazon-bedrock'
 *
 * const m = amazonBedrockModel('deepseek.r1-v1:0')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * ```
 */
export function amazonBedrockModel(id: LiteralUnion<AmazonBedrockModelId, string>): ModelDefinition | null {
  return AMAZON_BEDROCK_MODELS.find((m) => m.id === id) ?? null
}
