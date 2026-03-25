import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { FunkaiConfig, PromptGroup } from "@funkai/config";
import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { getConfig } from "@/config.js";
import { generatePromptModule, generateRegistry, toFileSlug } from "@/lib/prompts/codegen.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runGeneratePipeline } from "@/lib/prompts/pipeline.js";

/** Zod schema for the `prompts generate` CLI arguments. */
export const generateArgs = z.object({
  out: z.string().optional().describe("Output directory for generated files"),
  includes: z.array(z.string()).optional().describe("Glob patterns to scan for .prompt files"),
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
    readonly includes?: readonly string[];
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
): {
  readonly out: string;
  readonly includes: readonly string[];
  readonly excludes: readonly string[];
  readonly partials?: string;
  readonly silent: boolean;
} {
  const out = args.out ?? (config && config.out);
  const includes = args.includes ?? (config && config.includes) ?? ["./**"];
  const excludes = (config && config.excludes) ?? [];
  const partials = args.partials ?? (config && config.partials);

  if (!out) {
    fail("Missing --out flag. Provide it via CLI or set prompts.out in funkai.config.ts.");
  }

  const resolved: {
    out: string;
    includes: readonly string[];
    excludes: readonly string[];
    silent: boolean;
    partials?: string;
  } = {
    out,
    includes,
    excludes,
    silent: args.silent,
  };
  if (partials !== undefined) {
    resolved.partials = partials;
  }
  return resolved;
}

/**
 * Shared handler for prompts code generation.
 *
 * @param params - Handler context with args, config, logger, and fail callback.
 */
export function handleGenerate({ args, config, logger, fail }: HandleGenerateParams): void {
  const { out, includes, excludes, partials, silent } = resolveGenerateArgs(args, config, fail);

  const configGroups = config && config.groups;
  const pipelineOptions: {
    includes: readonly string[];
    excludes: readonly string[];
    out: string;
    partials?: string;
    groups?: readonly PromptGroup[];
  } = { includes, excludes, out };
  if (partials !== undefined) {
    pipelineOptions.partials = partials;
  }
  if (configGroups !== undefined) {
    pipelineOptions.groups = configGroups;
  }
  const { discovered, lintResults, prompts } = runGeneratePipeline(pipelineOptions);

  if (!silent) {
    logger.info(`Found ${discovered} prompt(s)`);
  }

  if (!silent) {
    prompts.forEach((prompt) => {
      const varList = formatVarList(prompt.schema);
      logger.step(`${prompt.name}${varList}`);
    });
  }

  lintResults.flatMap((result) => result.diagnostics).forEach((diag) => {
    match(diag.level)
      .with("error", () => logger.error(diag.message))
      .with("warn", () => {
        if (!silent) {
          logger.warn(diag.message);
        }
      })
      .exhaustive();
  });

  if (hasLintErrors(lintResults)) {
    fail("Lint errors found. Fix them before generating.");
  }

  const outDir = resolve(out);
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: output directory from CLI config
  mkdirSync(outDir, { recursive: true });

  prompts.forEach((prompt) => {
    const content = generatePromptModule(prompt);
    const fileSlug = toFileSlug(prompt.name, prompt.group);
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated module to output directory
    writeFileSync(resolve(outDir, `${fileSlug}.ts`), content, "utf8");
  });

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
    const generateArgs2: {
      silent: boolean;
      out?: string;
      includes?: readonly string[];
      partials?: string;
    } = { silent: ctx.args.silent };
    if (ctx.args.out !== undefined) {
      generateArgs2.out = ctx.args.out;
    }
    if (ctx.args.includes !== undefined) {
      generateArgs2.includes = ctx.args.includes;
    }
    if (ctx.args.partials !== undefined) {
      generateArgs2.partials = ctx.args.partials;
    }
    handleGenerate({
      args: generateArgs2,
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });
  },
});
