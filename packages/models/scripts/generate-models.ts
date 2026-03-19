import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { lauf, z } from "laufen";

const API_URL = "https://models.dev/api.json";
const STALE_MS = 24 * 60 * 60 * 1000;

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
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
  };
  limit?: { context?: number; output?: number };
}

interface ApiProvider {
  id: string;
  name: string;
  models: Record<string, ApiModel>;
}

/**
 * Convert a provider key to a TypeScript constant name.
 * e.g. "openai" → "OPENAI_MODELS", "meta-llama" → "META_LLAMA_MODELS"
 *
 * @private
 */
function toConstName(provider: string): string {
  return `${provider.toUpperCase().replaceAll(/[^A-Z0-9]/g, "_")}_MODELS`;
}

/**
 * Lowercase the first character of a string, preserving the rest as-is.
 * e.g. "OpenAI" → "openAI", "GoogleVertex" → "googleVertex", "XAI" → "xAI"
 *
 * @private
 */
function lowerFirst(s: string): string {
  if (s.length === 0) {
    return s;
  }
  const [first] = s;
  if (first === undefined) {
    return s;
  }
  return first.toLowerCase() + s.slice(1);
}

/**
 * Return the correct indefinite article ("a" or "an") for a word.
 *
 * @private
 */
function article(word: string): string {
  if (/^[aeiou]/i.test(word)) {
    return "an";
  }
  return "a";
}

/**
 * Convert per-million-token rate to per-token rate, rounding to
 * eliminate floating-point noise (e.g. `8.000000000000001e-7`).
 *
 * @private
 */
function toPerToken(perMillion: number): number {
  return parseFloat((perMillion / 1_000_000).toPrecision(6));
}

/**
 * Format a number for codegen output, using scientific notation for
 * very small values.
 *
 * @private
 */
function fmtNum(n: number): string {
  if (n === 0) {
    return "0";
  }
  if (n < 0.000_000_1) {
    return n.toExponential();
  }
  return String(n);
}

/** @private */
function extractExampleId(model: ApiModel | undefined): string {
  if (model !== undefined && model !== null) {
    return model.id;
  }
  return "example-id";
}

/**
 * Build the pricing object literal string for a model.
 *
 * @private
 */
function extractCostField(cost: ApiModel["cost"], field: "input" | "output"): number {
  if (cost !== undefined && cost !== null) {
    return cost[field] ?? 0;
  }
  return 0;
}

function buildPricing(cost: ApiModel["cost"]): string {
  const costInput = extractCostField(cost, "input");
  const costOutput = extractCostField(cost, "output");
  const input = toPerToken(costInput);
  const output = toPerToken(costOutput);
  const parts: string[] = [`input: ${fmtNum(input)}`, `output: ${fmtNum(output)}`];

  if (cost !== undefined && cost !== null) {
    if (cost.cache_read !== undefined && cost.cache_read !== null && cost.cache_read > 0) {
      parts.push(`cacheRead: ${fmtNum(toPerToken(cost.cache_read))}`);
    }
    if (cost.cache_write !== undefined && cost.cache_write !== null && cost.cache_write > 0) {
      parts.push(`cacheWrite: ${fmtNum(toPerToken(cost.cache_write))}`);
    }
    if (cost.reasoning !== undefined && cost.reasoning !== null && cost.reasoning > 0) {
      parts.push(`reasoning: ${fmtNum(toPerToken(cost.reasoning))}`);
    }
  }

  return `{ ${parts.join(", ")} }`;
}

/**
 * Build the modalities object literal string.
 *
 * @private
 */
function extractModalityField(
  modalities: ApiModel["modalities"],
  field: "input" | "output",
): string[] {
  if (modalities !== undefined && modalities !== null) {
    return modalities[field] ?? ["text"];
  }
  return ["text"];
}

function buildModalities(modalities: ApiModel["modalities"]): string {
  const modalInput = extractModalityField(modalities, "input");
  const modalOutput = extractModalityField(modalities, "output");
  const input = JSON.stringify(modalInput);
  const output = JSON.stringify(modalOutput);
  return `{ input: ${input}, output: ${output} }`;
}

/**
 * Build the capabilities object literal string.
 *
 * @private
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
 * Extract context window and max output from a model's limit field.
 *
 * @private
 */
function getModelLimits(limit: ApiModel["limit"]): { contextWindow: number; maxOutput: number } {
  if (limit === undefined || limit === null) {
    return { contextWindow: 0, maxOutput: 0 };
  }
  const contextWindow = limit.context ?? 0;
  const maxOutput = limit.output ?? 0;
  return { contextWindow, maxOutput };
}

/**
 * Escape a string for use in a TypeScript single-quoted string literal.
 *
 * @private
 */
function escapeStr(s: string): string {
  return s
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("'", String.raw`\'`)
    .replaceAll("\n", String.raw`\n`)
    .replaceAll("\r", String.raw`\r`);
}

/**
 * Check whether the staleness cache file indicates a recent fetch.
 *
 * @private
 */
function isFresh(reqPath: string): boolean {
  if (!existsSync(reqPath)) {
    return false;
  }
  try {
    const timestamp = readFileSync(reqPath, "utf8").trim();
    const lastRun = new Date(timestamp).getTime();
    return Date.now() - lastRun < STALE_MS;
  } catch {
    return false;
  }
}

export default lauf({
  description: "Fetch model data from models.dev and generate TypeScript catalog files",
  args: {
    force: z.boolean().default(false).describe("Force-fetch ignoring staleness cache"),
  },
  async run(ctx) {
    const PACKAGE_ROOT = ctx.dir.package;
    const PROVIDERS_PATH = join(PACKAGE_ROOT, "providers.json");
    const CATALOG_DIR = join(PACKAGE_ROOT, "src", "catalog", "providers");
    const ENTRY_DIR = join(PACKAGE_ROOT, "src", "providers");
    const GENERATED_DIR = join(PACKAGE_ROOT, ".generated");
    const REQ_PATH = join(GENERATED_DIR, "req.txt");
    const ENTRIES_PATH = join(GENERATED_DIR, "entries.json");
    const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");

    if (!ctx.args.force && isFresh(REQ_PATH)) {
      ctx.logger.info("skipping — last fetch was less than 24h ago");
      return;
    }

    // Read provider config
    const providers: Record<string, ProviderEntry> = JSON.parse(
      readFileSync(PROVIDERS_PATH, "utf8"),
    );
    const providerKeys = Object.keys(providers);

    if (providerKeys.length === 0) {
      throw new Error("providers.json has no providers");
    }

    // Fetch models.dev API
    ctx.spinner.start("Fetching models from models.dev");
    const response = await fetch(API_URL, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${API_URL}: ${response.status} ${response.statusText}`);
    }
    const apiData: Record<string, ApiProvider> = await response.json();
    ctx.spinner.stop(`${Object.keys(apiData).length} providers from API`);

    // Fail fast if any configured provider is missing from the API
    const missingProviders = providerKeys.filter((key) => !apiData[key]);
    if (missingProviders.length > 0) {
      throw new Error(
        `models.dev API is missing configured providers: ${missingProviders.join(", ")}`,
      );
    }

    mkdirSync(GENERATED_DIR, { recursive: true });

    // Clean and recreate catalog providers dir
    rmSync(CATALOG_DIR, { recursive: true, force: true });
    mkdirSync(CATALOG_DIR, { recursive: true });

    // Clean and recreate entry points dir
    rmSync(ENTRY_DIR, { recursive: true, force: true });
    mkdirSync(ENTRY_DIR, { recursive: true });

    const providerFiles = providerKeys.flatMap((providerKey) => {
      const apiProviderEntry = apiData[providerKey];
      const providerEntry = providers[providerKey];
      if (apiProviderEntry === undefined || providerEntry === undefined) {
        return [];
      }
      if (apiProviderEntry.models === undefined || apiProviderEntry.models === null) {
        throw new Error(
          `models.dev API returned no models for configured provider: ${providerKey}`,
        );
      }
      const apiModels = apiProviderEntry.models;
      const constName = toConstName(providerKey);
      const lines = Object.values(apiModels).map((m) => {
        const id = escapeStr(m.id);
        const name = escapeStr(m.name ?? m.id);
        const family = escapeStr(m.family ?? "");
        const pricing = buildPricing(m.cost);
        const { contextWindow, maxOutput } = getModelLimits(m.limit);
        const modalities = buildModalities(m.modalities);
        const capabilities = buildCapabilities(m);

        return `  { id: '${id}', name: '${name}', provider: '${providerKey}', family: '${family}', pricing: ${pricing}, contextWindow: ${contextWindow}, maxOutput: ${maxOutput}, modalities: ${modalities}, capabilities: { ${capabilities} } },`;
      });

      // Write catalog provider file
      const catalogContent = `${BANNER}

import type { ModelDefinition } from '../types.js'

export const ${constName} = [
${lines.join("\n")}
] as const satisfies readonly ModelDefinition[]
`;

      const catalogPath = join(CATALOG_DIR, `${providerKey}.ts`);
      writeFileSync(catalogPath, catalogContent, "utf8");

      // Write per-provider entry point
      const { prefix } = providerEntry;
      const camel = lowerFirst(prefix);
      const [firstModel] = Object.values(apiModels);
      const exampleId = escapeStr(extractExampleId(firstModel));
      const providerName = escapeStr(providerEntry.name);
      const art = article(providerEntry.name);
      const entryContent = `${BANNER}

import type { LiteralUnion } from 'type-fest'
import type { ModelDefinition } from '../catalog/types.js'
import { ${constName} } from '../catalog/providers/${providerKey}.js'

/**
 * Known model identifiers for ${providerName}.
 *
 * @example
 * \`\`\`typescript
 * import type { ${prefix}ModelId } from '@funkai/models/${providerKey}'
 *
 * const id: ${prefix}ModelId = '${exampleId}'
 * \`\`\`
 */
export type ${prefix}ModelId = (typeof ${constName})[number]['id']

/**
 * All ${providerName} models in the catalog.
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

/** @private */
const MODEL_INDEX = new Map<string, ModelDefinition>(${constName}.map((m) => [m.id, m]))

/**
 * Look up ${art} ${providerName} model by ID.
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
  return MODEL_INDEX.get(id) ?? null
}
`;

      const entryPath = join(ENTRY_DIR, `${providerKey}.ts`);
      writeFileSync(entryPath, entryContent, "utf8");

      ctx.logger.success(`${providerKey} (${lines.length} models)`);
      return [{ provider: providerKey, constName, count: lines.length }];
    });

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

    writeFileSync(join(CATALOG_DIR, "index.ts"), catalogBarrel, "utf8");
    ctx.logger.success("catalog/providers/index.ts (barrel)");

    // Write generated entries list for tsdown config
    const entryPoints = providerFiles.map((p) => `src/providers/${p.provider}.ts`);
    writeFileSync(ENTRIES_PATH, JSON.stringify(entryPoints, null, 2), "utf8");
    ctx.logger.success(".generated/entries.json");

    // Update package.json exports map
    const pkgRaw = readFileSync(PACKAGE_JSON_PATH, "utf8");
    const pkg = JSON.parse(pkgRaw);

    const exportsMap: Record<string, { types: string; import: string }> = {
      ".": {
        types: "./dist/index.d.mts",
        import: "./dist/index.mjs",
      },
      ...Object.fromEntries(
        providerFiles.map((p) => [
          `./${p.provider}`,
          {
            types: `./dist/providers/${p.provider}.d.mts`,
            import: `./dist/providers/${p.provider}.mjs`,
          },
        ]),
      ),
    };

    pkg.exports = exportsMap;
    writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    ctx.logger.success("package.json exports map updated");

    // Staleness timestamp
    writeFileSync(REQ_PATH, new Date().toISOString(), "utf8");

    const totalModels = providerFiles.reduce((sum, p) => sum + p.count, 0);
    ctx.logger.info(`done (${providerFiles.length} providers, ${totalModels} models)`);
  },
});
