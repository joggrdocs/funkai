import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { generatePromptModule, generateRegistry } from "@/lib/prompts/codegen.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runGeneratePipeline } from "@/lib/prompts/pipeline.js";

/** Zod schema for the `prompts generate` CLI arguments. */
export const generateArgs = z.object({
  out: z.string().describe("Output directory for generated files"),
  roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
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
    readonly out: string;
    readonly roots: readonly string[];
    readonly partials?: string;
    readonly silent: boolean;
  };
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
 * Shared handler for prompts code generation.
 *
 * @param params - Handler context with args, logger, and fail callback.
 */
export function handleGenerate({ args, logger, fail }: HandleGenerateParams): void {
  const { out, roots, partials, silent } = args;

  const { discovered, lintResults, prompts } = runGeneratePipeline({ roots, out, partials });

  if (!silent) {
    logger.info(`Found ${discovered} prompt(s)`);
  }

  if (!silent) {
    prompts.forEach((prompt) => {
      const varList = formatVarList(prompt.schema);
      logger.step(`${prompt.name}${varList}`);
    });
  }

  lintResults
    .flatMap((result) => result.diagnostics)
    .forEach((diag) => {
      match(diag.level)
        .with("error", () => logger.error(diag.message))
        .with("warn", () => logger.warn(diag.message))
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
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated module to output directory
    writeFileSync(resolve(outDir, `${prompt.name}.ts`), content, "utf8");
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
    handleGenerate({ args: ctx.args, logger: ctx.logger, fail: ctx.fail });
  },
});
