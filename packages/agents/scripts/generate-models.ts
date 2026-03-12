/* eslint-disable security/detect-non-literal-fs-filename */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { OpenRouter } from '@openrouter/sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = join(__dirname, '..')
const CONFIG_PATH = join(PACKAGE_ROOT, 'models.config.json')
const MODELS_DIR = join(PACKAGE_ROOT, 'src', 'models')
const PROVIDERS_DIR = join(MODELS_DIR, 'providers')
const GENERATED_DIR = join(PACKAGE_ROOT, '.generated')
const REQ_PATH = join(GENERATED_DIR, 'req.txt')

const STALE_MS = 24 * 60 * 60 * 1000

/**
 * Pricing fields we extract from the OpenRouter API.
 * Maps API field name → our camelCase field name.
 */
const PRICING_FIELDS: Record<string, string> = {
  prompt: 'prompt',
  completion: 'completion',
  inputCacheRead: 'inputCacheRead',
  inputCacheWrite: 'inputCacheWrite',
  webSearch: 'webSearch',
  internalReasoning: 'internalReasoning',
  image: 'image',
  audio: 'audio',
  audioOutput: 'audioOutput',
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

const BANNER = `// ──────────────────────────────────────────────────────────────
//  █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗
// ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║
// ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
//
// AUTO-GENERATED — DO NOT EDIT
// Update: pnpm --filter=@pkg/agent-sdk generate:models
// ──────────────────────────────────────────────────────────────`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigEntry {
  id: string
  category: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a provider key to a constant name.
 * e.g. "openai" → "OPENAI_MODELS"
 */
function toConstName(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_MODELS`
}

/**
 * Build the pricing object string for a model, including only non-zero fields.
 */
function buildPricing(apiPricing: Record<string, string | undefined>): string {
  const parts: string[] = []
  for (const [apiKey, ourKey] of Object.entries(PRICING_FIELDS)) {
    // eslint-disable-next-line security/detect-object-injection -- Key from Object.entries iteration over a static config object
    const raw = apiPricing[apiKey]
    if (!raw) {
      continue
    }
    const value = parseFloat(raw)
    if (value === 0) {
      continue
    }
    parts.push(`${ourKey}: ${value}`)
  }
  return `{ ${parts.join(', ')} }`
}

// ---------------------------------------------------------------------------
// Staleness check
// ---------------------------------------------------------------------------

function isFresh(): boolean {
  if (!existsSync(REQ_PATH)) {
    return false
  }
  try {
    const timestamp = readFileSync(REQ_PATH, 'utf-8').trim()
    const lastRun = new Date(timestamp).getTime()
    return Date.now() - lastRun < STALE_MS
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Root index.ts — types, helpers, re-exports.
 */
function rootIndex(): string {
  return `${BANNER}

import { MODELS as GENERATED_MODELS } from './providers/index.js'

/**
 * Supported OpenRouter model identifiers, derived from the generated {@link MODELS} array.
 */
export type OpenRouterLanguageModelId = (typeof GENERATED_MODELS)[number]['id']

/**
 * Model category for classification and filtering.
 */
export type ModelCategory = 'chat' | 'coding' | 'reasoning'

/**
 * Per-model pricing in USD per token.
 *
 * Field names match the OpenRouter API convention. All values are
 * per-token (or per-unit) rates as numbers. Optional fields are
 * omitted when the provider does not support them.
 */
export interface ModelPricing {
  /** Cost per input (prompt) token. */
  prompt: number

  /** Cost per output (completion) token. */
  completion: number

  /** Cost per cached input token (read). */
  inputCacheRead?: number

  /** Cost per cached input token (write). */
  inputCacheWrite?: number

  /** Cost per web search request. */
  webSearch?: number

  /** Cost per internal reasoning token. */
  internalReasoning?: number

  /** Cost per image input token. */
  image?: number

  /** Cost per audio input second. */
  audio?: number

  /** Cost per audio output second. */
  audioOutput?: number
}

/**
 * Model definition with metadata and pricing.
 */
export interface ModelDefinition {
  /** OpenRouter model identifier (e.g. \`"openai/gpt-5.2-codex"\`). */
  id: string

  /** Model category for classification. */
  category: ModelCategory

  /** Token pricing rates. */
  pricing: ModelPricing
}

/**
 * Supported OpenRouter models with pricing data.
 */
export const MODELS = GENERATED_MODELS satisfies readonly ModelDefinition[]

/**
 * Look up a model definition by its identifier.
 *
 * @param id - The model identifier to look up.
 * @returns The matching model definition.
 * @throws {Error} If no model matches the given ID.
 *
 * @example
 * \`\`\`typescript
 * const m = model('openai/gpt-5.2-codex')
 * console.log(m.pricing.prompt) // 0.00000175
 * console.log(m.category)       // 'coding'
 * \`\`\`
 */
export function model(id: OpenRouterLanguageModelId): ModelDefinition {
  const found = MODELS.find((m) => m.id === id)
  if (!found) {
    throw new Error(\`Unknown model: \${id}\`)
  }
  return found
}

/**
 * Return supported model definitions, optionally filtered.
 *
 * @param filter - Optional predicate to filter models.
 * @returns A readonly array of matching model definitions.
 *
 * @example
 * \`\`\`typescript
 * const all = models()
 * const reasoning = models((m) => m.category === 'reasoning')
 * \`\`\`
 */
export function models(filter?: (m: ModelDefinition) => boolean): readonly ModelDefinition[] {
  return filter ? MODELS.filter(filter) : MODELS
}
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (isFresh()) {
    console.log('generate-models: skipping — last fetch was less than 24h ago')
    return
  }

  const config: Record<string, ConfigEntry[]> = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))

  const providers = Object.keys(config)
  if (providers.length === 0) {
    throw new Error('models.config.json has no providers')
  }

  console.log('generate-models: fetching models from OpenRouter SDK')
  const client = new OpenRouter()
  const response = await client.models.list()
  const apiModels = response.data ?? []
  const modelMap = new Map(apiModels.map((m) => [m.id, m]))

  console.log(`generate-models: ${apiModels.length} models from API`)

  mkdirSync(GENERATED_DIR, { recursive: true })

  // Clean and recreate entire models dir (everything is generated)
  rmSync(MODELS_DIR, { recursive: true, force: true })
  mkdirSync(PROVIDERS_DIR, { recursive: true })

  const providerFiles: { provider: string; constName: string }[] = []

  for (const provider of providers) {
    // eslint-disable-next-line security/detect-object-injection -- Provider key from controlled iteration, not user input
    const entries = config[provider]
    const constName = toConstName(provider)
    const lines: string[] = []

    for (const entry of entries) {
      const apiModel = modelMap.get(entry.id)
      if (!apiModel) {
        console.warn(`  ⚠ ${entry.id} not found in OpenRouter API — skipping`)
        continue
      }

      const pricing = buildPricing(
        apiModel.pricing as unknown as Record<string, string | undefined>
      )

      lines.push(`  { id: '${entry.id}', category: '${entry.category}', pricing: ${pricing} },`)
    }

    const content = `${BANNER}

export const ${constName} = [
${lines.join('\n')}
] as const
`

    const filePath = join(PROVIDERS_DIR, `${provider}.ts`)
    writeFileSync(filePath, content, 'utf-8')
    console.log(`  ✓ providers/${provider}.ts (${lines.length} models)`)

    providerFiles.push({ provider, constName })
  }

  // Providers barrel
  const imports = providerFiles
    .map((p) => `import { ${p.constName} } from './${p.provider}.js'`)
    .join('\n')

  const spreads = providerFiles.map((p) => `  ...${p.constName},`).join('\n')

  const providersBarrel = `${BANNER}

${imports}

export const MODELS = [
${spreads}
] as const
`

  writeFileSync(join(PROVIDERS_DIR, 'index.ts'), providersBarrel, 'utf-8')
  console.log('  ✓ providers/index.ts (barrel)')

  // Root index
  writeFileSync(join(MODELS_DIR, 'index.ts'), rootIndex(), 'utf-8')
  console.log('  ✓ index.ts (types + helpers)')

  // Staleness timestamp
  writeFileSync(REQ_PATH, new Date().toISOString(), 'utf-8')

  console.log('generate-models: done')
}

main().catch((err) => {
  console.error('generate-models: fatal error', err)
  process.exit(1)
})
