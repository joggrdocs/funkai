import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Context } from "@kidd-cli/core";
import { command } from "@kidd-cli/core";

const VSCODE_DIR = ".vscode";
const SETTINGS_FILE = "settings.json";
const EXTENSIONS_FILE = "extensions.json";
const GITIGNORE_FILE = ".gitignore";
const TSCONFIG_FILE = "tsconfig.json";
const GITIGNORE_ENTRY = ".prompts/client/";
const PROMPTS_ALIAS = "~prompts";
const PROMPTS_ALIAS_PATH = "./.prompts/client/index.ts";

/**
 * Shared prompts setup logic used by both `funkai prompts setup` and `funkai setup`.
 *
 * @param ctx - The CLI context with prompts and logger.
 */
export async function setupPrompts(ctx: Pick<Context, "prompts" | "logger">): Promise<void> {
  const shouldConfigure = await ctx.prompts.confirm({
    message: "Configure VSCode to treat .prompt files as Markdown with Liquid syntax?",
    initialValue: true,
  });

  if (shouldConfigure) {
    const vscodeDir = resolve(VSCODE_DIR);
    mkdirSync(vscodeDir, { recursive: true });

    const settingsPath = resolve(vscodeDir, SETTINGS_FILE);
    const settings = readJsonFile(settingsPath);

    const updatedSettings = {
      ...settings,
      "files.associations": {
        ...((settings["files.associations"] ?? {}) as Record<string, string>),
        "*.prompt": "markdown",
      },
      "liquid.engine": "standard",
    };

    writeFileSync(settingsPath, `${JSON.stringify(updatedSettings, null, 2)}\n`, "utf8");
    ctx.logger.success(`Updated ${settingsPath}`);
  }

  const shouldRecommend = await ctx.prompts.confirm({
    message: "Add Shopify Liquid extension to VSCode recommendations?",
    initialValue: true,
  });

  if (shouldRecommend) {
    const vscodeDir = resolve(VSCODE_DIR);
    mkdirSync(vscodeDir, { recursive: true });

    const extensionsPath = resolve(vscodeDir, EXTENSIONS_FILE);
    const extensions = readJsonFile(extensionsPath);

    const currentRecs = (extensions.recommendations ?? []) as string[];
    const extensionId = "sissel.shopify-liquid";

    const recommendations = ensureRecommendation(currentRecs, extensionId);
    const updatedExtensions = {
      ...extensions,
      recommendations,
    };

    writeFileSync(extensionsPath, `${JSON.stringify(updatedExtensions, null, 2)}\n`, "utf8");
    ctx.logger.success(`Updated ${extensionsPath}`);
  }

  const shouldGitignore = await ctx.prompts.confirm({
    message: "Add .prompts/client/ to .gitignore? (generated client should not be committed)",
    initialValue: true,
  });

  if (shouldGitignore) {
    const gitignorePath = resolve(GITIGNORE_FILE);
    const existing = readFileOrEmpty(gitignorePath);

    if (existing.includes(GITIGNORE_ENTRY)) {
      ctx.logger.info(`${GITIGNORE_ENTRY} already in ${gitignorePath}`);
    } else {
      const separator = trailingSeparator(existing);
      const block = `${separator}\n# Generated prompt client (created by \`funkai prompts generate\`)\n${GITIGNORE_ENTRY}\n`;
      writeFileSync(gitignorePath, `${existing}${block}`, "utf8");
      ctx.logger.success(`Added ${GITIGNORE_ENTRY} to ${gitignorePath}`);
    }
  }

  const shouldTsconfig = await ctx.prompts.confirm({
    message: "Add ~prompts path alias to tsconfig.json?",
    initialValue: true,
  });

  if (shouldTsconfig) {
    const tsconfigPath = resolve(TSCONFIG_FILE);
    const tsconfig = readJsonFile(tsconfigPath);

    const compilerOptions = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>;
    const existingPaths = (compilerOptions.paths ?? {}) as Record<string, string[]>;

    // oxlint-disable-next-line security/detect-object-injection -- safe: PROMPTS_ALIAS is a known constant string
    if (existingPaths[PROMPTS_ALIAS]) {
      ctx.logger.info(`${PROMPTS_ALIAS} alias already in ${tsconfigPath}`);
    } else {
      const updatedTsconfig = {
        ...tsconfig,
        compilerOptions: {
          ...compilerOptions,
          paths: {
            ...existingPaths,
            // oxlint-disable-next-line security/detect-object-injection -- safe: PROMPTS_ALIAS is a known constant string
            [PROMPTS_ALIAS]: [PROMPTS_ALIAS_PATH],
          },
        },
      };

      writeFileSync(tsconfigPath, `${JSON.stringify(updatedTsconfig, null, 2)}\n`, "utf8");
      ctx.logger.success(`Added ${PROMPTS_ALIAS} alias to ${tsconfigPath}`);
    }
  }
}

export default command({
  description: "Configure VSCode IDE settings for .prompt files",
  async handler(ctx) {
    ctx.logger.intro("Prompt SDK — Project Setup");
    await setupPrompts(ctx);
    ctx.logger.outro("Prompts setup complete.");
  },
});

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/** @private */
function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** @private */
function ensureRecommendation(current: readonly string[], id: string): string[] {
  if (current.includes(id)) {
    return [...current];
  }
  return [...current, id];
}

/** @private */
function readFileOrEmpty(filePath: string): string {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading file from CLI discovery
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf8");
  }
  return "";
}

/** @private */
function trailingSeparator(content: string): string {
  if (content.length > 0 && !content.endsWith("\n")) {
    return "\n";
  }
  return "";
}

/**
 * Read a JSON file, returning an empty object if it doesn't exist.
 * Throws if the file exists but contains invalid JSON, preventing
 * silent data loss from overwriting malformed config files.
 *
 * @private
 */
function readJsonFile(filePath: string): Record<string, unknown> {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: tsconfig path from CLI discovery
  if (!existsSync(filePath)) {
    return {};
  }

  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading tsconfig file
  const content = readFileSync(filePath, "utf8");
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to parse ${filePath}: ${errorMessage(error)}. ` +
        "Fix the JSON syntax or remove the file before running setup.",
      { cause: error },
    );
  }
}
