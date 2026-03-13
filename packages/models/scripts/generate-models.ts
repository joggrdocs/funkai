/* eslint-disable security/detect-non-literal-fs-filename */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OpenRouter } from "@openrouter/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const CONFIG_PATH = join(PACKAGE_ROOT, "models.config.json");
const PROVIDERS_DIR = join(PACKAGE_ROOT, "src", "catalog", "providers");
const GENERATED_DIR = join(PACKAGE_ROOT, ".generated");
const REQ_PATH = join(GENERATED_DIR, "req.txt");

const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Pricing fields we extract from the OpenRouter API.
 * Maps API field name → our camelCase field name.
 */
const PRICING_FIELDS: Record<string, string> = {
  prompt: "prompt",
  completion: "completion",
  inputCacheRead: "inputCacheRead",
  inputCacheWrite: "inputCacheWrite",
  webSearch: "webSearch",
  internalReasoning: "internalReasoning",
  image: "image",
  audio: "audio",
  audioOutput: "audioOutput",
};

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
// Update: pnpm --filter=@funkai/models generate:models
// ──────────────────────────────────────────────────────────────`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigEntry {
  id: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a provider key to a constant name.
 * e.g. "openai" → "OPENAI_MODELS", "meta-llama" → "META_LLAMA_MODELS"
 */
function toConstName(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MODELS`;
}

/**
 * Build the pricing object string for a model, including only non-zero fields.
 */
function buildPricing(modelId: string, apiPricing: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [apiKey, ourKey] of Object.entries(PRICING_FIELDS)) {
    // eslint-disable-next-line security/detect-object-injection -- Key from Object.entries iteration over a static config object
    const raw = apiPricing[apiKey];
    if (!raw) {
      continue;
    }
    const value = parseFloat(raw);
    if (Number.isNaN(value)) {
      throw new Error(`Invalid pricing value for "${modelId}" field "${apiKey}": "${raw}"`);
    }
    if (value === 0) {
      continue;
    }
    parts.push(`${ourKey}: ${value}`);
  }
  return `{ ${parts.join(", ")} }`;
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

  const config: Record<string, ConfigEntry[]> = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));

  const providers = Object.keys(config);
  if (providers.length === 0) {
    throw new Error("models.config.json has no providers");
  }

  console.log("generate-models: fetching models from OpenRouter SDK");
  const client = new OpenRouter();
  const response = await client.models.list();
  const apiModels = response.data ?? [];
  const modelMap = new Map(apiModels.map((m) => [m.id, m]));

  console.log(`generate-models: ${apiModels.length} models from API`);

  mkdirSync(GENERATED_DIR, { recursive: true });

  // Clean and recreate providers dir (all provider files are generated)
  rmSync(PROVIDERS_DIR, { recursive: true, force: true });
  mkdirSync(PROVIDERS_DIR, { recursive: true });

  const providerFiles: { provider: string; constName: string }[] = [];

  for (const provider of providers) {
    // eslint-disable-next-line security/detect-object-injection -- Provider key from controlled iteration, not user input
    const entries = config[provider];
    const constName = toConstName(provider);
    const lines: string[] = [];

    for (const entry of entries) {
      const apiModel = modelMap.get(entry.id);
      if (!apiModel) {
        console.warn(`  ⚠ ${entry.id} not found in OpenRouter API — skipping`);
        continue;
      }

      const pricing = buildPricing(
        entry.id,
        apiModel.pricing as unknown as Record<string, string | undefined>,
      );

      lines.push(`  { id: '${entry.id}', category: '${entry.category}', pricing: ${pricing} },`);
    }

    const content = `${BANNER}

export const ${constName} = [
${lines.join("\n")}
] as const
`;

    const filePath = join(PROVIDERS_DIR, `${provider}.ts`);
    writeFileSync(filePath, content, "utf-8");
    console.log(`  ✓ providers/${provider}.ts (${lines.length} models)`);

    providerFiles.push({ provider, constName });
  }

  // Providers barrel
  const imports = providerFiles
    .map((p) => `import { ${p.constName} } from './${p.provider}.js'`)
    .join("\n");

  const spreads = providerFiles.map((p) => `  ...${p.constName},`).join("\n");

  const providersBarrel = `${BANNER}

${imports}

export const MODELS = [
${spreads}
] as const
`;

  writeFileSync(join(PROVIDERS_DIR, "index.ts"), providersBarrel, "utf-8");
  console.log("  ✓ providers/index.ts (barrel)");

  // Staleness timestamp
  writeFileSync(REQ_PATH, new Date().toISOString(), "utf-8");

  console.log("generate-models: done");
}

main().catch((err) => {
  console.error("generate-models: fatal error", err);
  process.exit(1);
});
