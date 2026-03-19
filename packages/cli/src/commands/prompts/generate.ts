import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { FunkaiConfig } from "@funkai/config";
import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { getConfig } from "@/config.js";

import { generatePromptModule, generateRegistry } from "@/lib/prompts/codegen.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runGeneratePipeline } from "@/lib/prompts/pipeline.js";

/** Zod schema for the `prompts generate` CLI arguments. */
export const generateArgs = z.object({
  out: z.string().optional().describe("Output directory for generated files"),
  roots: z.array(z.string()).optional().describe("Root directories to scan for .prompt files"),
  partials: z.string().optional().describe("Custom partials directory"),
  silent: z.boolean().default(false).describe("Suppress output except errors"),
});

/** Inferred type of the `prompts generate` CLI arguments. */
export type GenerateArgs = z.infer<typeof generateArgs>;

/**
 * Parameters for the shared generate handler.
 */
export interface HandleGenerateParams {
  readonly args: {
    readonly out?: string;
    readonly roots?: readonly string[];
    readonly partials?: string;
    readonly silent: boolean;
  };
  readonly config?: FunkaiConfig["prompts"];
  readonly logger: {
    info: (msg: string) => void;
    step: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
    success: (msg: string) => void;
  };
  readonly fail: (msg: string) => never;
}

/**
 * Resolve generate args by merging CLI flags with config defaults.
 *
 * @param args - CLI arguments (take precedence).
 * @param config - Prompts config from funkai.config.ts (fallback).
 * @param fail - Error handler for missing required values.
 * @returns Resolved args with required fields guaranteed.
 */
function resolveGenerateArgs(
  args: HandleGenerateParams["args"],
  config: FunkaiConfig["prompts"],
  fail: (msg: string) => never,
): { readonly out: string; readonly roots: readonly string[]; readonly partials?: string; readonly silent: boolean } {
  const configOut = config && config.out;
  const configRoots = config && config.roots;
  const configPartials = config && config.partials;
  const out = args.out ?? configOut;
  const roots = args.roots ?? configRoots;
  const partials = args.partials ?? configPartials;

  if (!out) {
    fail("Missing --out flag. Provide it via CLI or set prompts.out in funkai.config.ts.");
  }
  if (!roots || roots.length === 0) {
    fail("Missing --roots flag. Provide it via CLI or set prompts.roots in funkai.config.ts.");
  }

  return { out, roots, partials, silent: args.silent };
}

/**
 * Shared handler for prompts code generation.
 *
 * @param params - Handler context with args, config, logger, and fail callback.
 */
export function handleGenerate({ args, config, logger, fail }: HandleGenerateParams): void {
  const { out, roots, partials, silent } = resolveGenerateArgs(args, config, fail);

  const { discovered, lintResults, prompts } = runGeneratePipeline({ roots, out, partials });

  if (!silent) {
    logger.info(`Found ${discovered} prompt(s)`);
  }

  if (!silent) {
    for (const prompt of prompts) {
      const varList = formatVarList(prompt.schema);
      logger.step(`${prompt.name}${varList}`);
    }
  }

  for (const diag of lintResults.flatMap((result) => result.diagnostics)) {
    match(diag.level)
      .with("error", () => logger.error(diag.message))
      .with("warn", () => {
        if (!silent) {
          logger.warn(diag.message);
        }
      })
      .exhaustive();
  }

  if (hasLintErrors(lintResults)) {
    fail("Lint errors found. Fix them before generating.");
  }

  const outDir = resolve(out);
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: output directory from CLI config
  mkdirSync(outDir, { recursive: true });

  for (const prompt of prompts) {
    const content = generatePromptModule(prompt);
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated module to output directory
    writeFileSync(resolve(outDir, `${prompt.name}.ts`), content, "utf8");
  }

  const registryContent = generateRegistry(prompts);
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated registry to output directory
  writeFileSync(resolve(outDir, "index.ts"), registryContent, "utf8");

  if (!silent) {
    logger.success(`Generated ${prompts.length} prompt module(s) + registry → ${outDir}`);
  }
}

/** @private */
function formatVarList(schema: readonly { readonly name: string }[]): string {
  if (schema.length > 0) {
    return ` (${schema.map((v) => v.name).join(", ")})`;
  }
  return "";
}

export default command({
  description: "Generate TypeScript modules from .prompt files",
  options: generateArgs,
  handler(ctx) {
    const config = getConfig(ctx);
    handleGenerate({
      args: ctx.args,
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });
  },
});
