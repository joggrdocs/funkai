/* eslint-disable security/detect-non-literal-fs-filename */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const PROVIDERS_PATH = join(PACKAGE_ROOT, "providers.json");
const CATALOG_DIR = join(PACKAGE_ROOT, "src", "catalog", "providers");
const ENTRY_DIR = join(PACKAGE_ROOT, "src", "providers");
const GENERATED_DIR = join(PACKAGE_ROOT, ".generated");
const REQ_PATH = join(GENERATED_DIR, "req.txt");
const ENTRIES_PATH = join(GENERATED_DIR, "entries.json");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");

const API_URL = "https://models.dev/api.json";
const STALE_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

const BANNER = `// ──────────────────────────────────────────────────────────────
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
// ──────────────────────────────────────────────────────────────`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderEntry {
  name: string;
  prefix: string;
  sdk: string;
}

interface ApiModel {
  id: string;
  name?: string;
  family?: string;
  reasoning?: boolean;
  tool_call?: boolean;
  attachment?: boolean;
  structured_output?: boolean;
  modalities?: { input?: string[]; output?: string[] };
  cost?: { input?: number; output?: number; cache_read?: number; cache_write?: number };
  limit?: { context?: number; output?: number };
}

interface ApiProvider {
  id: string;
  name: string;
  models: Record<string, ApiModel>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a provider key to a TypeScript constant name.
 * e.g. "openai" → "OPENAI_MODELS", "meta-llama" → "META_LLAMA_MODELS"
 */
function toConstName(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MODELS`;
}

/**
 * Lowercase the first character of a string, preserving the rest as-is.
 * e.g. "OpenAI" → "openAI", "GoogleVertex" → "googleVertex", "XAI" → "xAI"
 */
function lowerFirst(s: string): string {
  return s.length === 0 ? s : s[0]!.toLowerCase() + s.slice(1);
}

/**
 * Convert per-million-token rate to per-token rate.
 */
function toPerToken(perMillion: number): number {
  return perMillion / 1_000_000;
}

/**
 * Format a number for codegen output, using scientific notation for
 * very small values.
 */
function fmtNum(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0000001) return n.toExponential();
  return String(n);
}

/**
 * Build the pricing object literal string for a model.
 */
function buildPricing(cost: ApiModel["cost"]): string {
  const input = toPerToken(cost?.input ?? 0);
  const output = toPerToken(cost?.output ?? 0);
  const parts: string[] = [`input: ${fmtNum(input)}`, `output: ${fmtNum(output)}`];

  if (cost?.cache_read != null && cost.cache_read > 0) {
    parts.push(`cacheRead: ${fmtNum(toPerToken(cost.cache_read))}`);
  }
  if (cost?.cache_write != null && cost.cache_write > 0) {
    parts.push(`cacheWrite: ${fmtNum(toPerToken(cost.cache_write))}`);
  }

  return `{ ${parts.join(", ")} }`;
}

/**
 * Build the modalities object literal string.
 */
function buildModalities(modalities: ApiModel["modalities"]): string {
  const input = JSON.stringify(modalities?.input ?? ["text"]);
  const output = JSON.stringify(modalities?.output ?? ["text"]);
  return `{ input: ${input}, output: ${output} }`;
}

/**
 * Build the capabilities object literal string.
 */
function buildCapabilities(m: ApiModel): string {
  return [
    `reasoning: ${Boolean(m.reasoning)}`,
    `toolCall: ${Boolean(m.tool_call)}`,
    `attachment: ${Boolean(m.attachment)}`,
    `structuredOutput: ${Boolean(m.structured_output)}`,
  ].join(", ");
}

/**
 * Escape a string for use in a TypeScript single-quoted string literal.
 */
function escapeStr(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

// ---------------------------------------------------------------------------
// Staleness check
// ---------------------------------------------------------------------------

function isFresh(): boolean {
  if (!existsSync(REQ_PATH)) {
    return false;
  }
  try {
    const timestamp = readFileSync(REQ_PATH, "utf-8").trim();
    const lastRun = new Date(timestamp).getTime();
    return Date.now() - lastRun < STALE_MS;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const forceFlag = process.argv.includes("--force");

  if (!forceFlag && isFresh()) {
    console.log("generate-models: skipping — last fetch was less than 24h ago");
    return;
  }

  // Read provider config
  const providers: Record<string, ProviderEntry> = JSON.parse(readFileSync(PROVIDERS_PATH, "utf-8"));
  const providerKeys = Object.keys(providers);

  if (providerKeys.length === 0) {
    throw new Error("providers.json has no providers");
  }

  // Fetch models.dev API
  console.log("generate-models: fetching models from models.dev");
  const response = await fetch(API_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${API_URL}: ${response.status} ${response.statusText}`);
  }
  const apiData: Record<string, ApiProvider> = await response.json();
  console.log(`generate-models: ${Object.keys(apiData).length} providers from API`);

  mkdirSync(GENERATED_DIR, { recursive: true });

  // Clean and recreate catalog providers dir
  rmSync(CATALOG_DIR, { recursive: true, force: true });
  mkdirSync(CATALOG_DIR, { recursive: true });

  // Clean and recreate entry points dir
  rmSync(ENTRY_DIR, { recursive: true, force: true });
  mkdirSync(ENTRY_DIR, { recursive: true });

  const providerFiles: { provider: string; constName: string; count: number }[] = [];

  for (const providerKey of providerKeys) {
    // eslint-disable-next-line security/detect-object-injection -- Key from controlled iteration
    const apiProvider = apiData[providerKey];
    if (!apiProvider) {
      console.warn(`  ⚠ provider "${providerKey}" not found in models.dev API — skipping`);
      continue;
    }

    const apiModels = apiProvider.models ?? {};
    const constName = toConstName(providerKey);
    const lines: string[] = [];

    for (const [, m] of Object.entries(apiModels)) {
      const id = escapeStr(m.id);
      const name = escapeStr(m.name ?? m.id);
      const family = escapeStr(m.family ?? "");
      const pricing = buildPricing(m.cost);
      const contextWindow = m.limit?.context ?? 0;
      const maxOutput = m.limit?.output ?? 0;
      const modalities = buildModalities(m.modalities);
      const capabilities = buildCapabilities(m);

      lines.push(
        `  { id: '${id}', name: '${name}', provider: '${providerKey}', family: '${family}', ` +
          `pricing: ${pricing}, contextWindow: ${contextWindow}, maxOutput: ${maxOutput}, ` +
          `modalities: ${modalities}, capabilities: { ${capabilities} } },`,
      );
    }

    // Write catalog provider file
    const catalogContent = `${BANNER}

import type { ModelDefinition } from '../types.js'

export const ${constName} = [
${lines.join("\n")}
] as const satisfies readonly ModelDefinition[]
`;

    const catalogPath = join(CATALOG_DIR, `${providerKey}.ts`);
    writeFileSync(catalogPath, catalogContent, "utf-8");

    // Write per-provider entry point
    const prefix = providers[providerKey]!.prefix;
    const camel = lowerFirst(prefix);
    const exampleId = escapeStr(Object.values(apiModels)[0]?.id ?? "example-id");
    const entryContent = `${BANNER}

import type { LiteralUnion } from 'type-fest'
import type { ModelDefinition } from '../catalog/types.js'
import { ${constName} } from '../catalog/providers/${providerKey}.js'

/**
 * Known model identifiers for ${escapeStr(providers[providerKey]!.name)}.
 */
export type ${prefix}ModelId = (typeof ${constName})[number]['id']

/**
 * All ${escapeStr(providers[providerKey]!.name)} models in the catalog.
 *
 * @example
 * \`\`\`typescript
 * import { ${camel}Models } from '@funkai/models/${providerKey}'
 *
 * for (const m of ${camel}Models) {
 *   console.log(m.id, m.pricing.input)
 * }
 * \`\`\`
 */
export const ${camel}Models = ${constName}

/**
 * Look up a ${escapeStr(providers[providerKey]!.name)} model by ID.
 *
 * @param id - The provider-native model identifier.
 * @returns The matching model definition, or \`null\`.
 *
 * @example
 * \`\`\`typescript
 * import { ${camel}Model } from '@funkai/models/${providerKey}'
 *
 * const m = ${camel}Model('${exampleId}')
 * if (m) {
 *   console.log(m.pricing.input)
 * }
 * \`\`\`
 */
export function ${camel}Model(id: LiteralUnion<${prefix}ModelId, string>): ModelDefinition | null {
  return ${constName}.find((m) => m.id === id) ?? null
}
`;

    const entryPath = join(ENTRY_DIR, `${providerKey}.ts`);
    writeFileSync(entryPath, entryContent, "utf-8");

    console.log(`  ✓ ${providerKey} (${lines.length} models)`);
    providerFiles.push({ provider: providerKey, constName, count: lines.length });
  }

  // Catalog barrel
  const imports = providerFiles
    .map((p) => `import { ${p.constName} } from './${p.provider}.js'`)
    .join("\n");

  const spreads = providerFiles.map((p) => `  ...${p.constName},`).join("\n");

  const catalogBarrel = `${BANNER}

import type { ModelDefinition } from '../types.js'
${imports}

export const MODELS = [
${spreads}
] as const satisfies readonly ModelDefinition[]
`;

  writeFileSync(join(CATALOG_DIR, "index.ts"), catalogBarrel, "utf-8");
  console.log("  ✓ catalog/providers/index.ts (barrel)");

  // Write generated entries list for tsdown config
  const entryPoints = providerFiles.map((p) => `src/providers/${p.provider}.ts`);
  writeFileSync(ENTRIES_PATH, JSON.stringify(entryPoints, null, 2), "utf-8");
  console.log("  ✓ .generated/entries.json");

  // Update package.json exports map
  const pkgRaw = readFileSync(PACKAGE_JSON_PATH, "utf-8");
  const pkg = JSON.parse(pkgRaw);

  const exportsMap: Record<string, { types: string; import: string }> = {
    ".": {
      types: "./dist/index.d.mts",
      import: "./dist/index.mjs",
    },
  };

  for (const p of providerFiles) {
    exportsMap[`./${p.provider}`] = {
      types: `./dist/providers/${p.provider}.d.mts`,
      import: `./dist/providers/${p.provider}.mjs`,
    };
  }

  pkg.exports = exportsMap;
  writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log("  ✓ package.json exports map updated");

  // Staleness timestamp
  writeFileSync(REQ_PATH, new Date().toISOString(), "utf-8");

  const totalModels = providerFiles.reduce((sum, p) => sum + p.count, 0);
  console.log(`generate-models: done (${providerFiles.length} providers, ${totalModels} models)`);
}

main().catch((err) => {
  console.error("generate-models: fatal error", err);
  process.exit(1);
});
