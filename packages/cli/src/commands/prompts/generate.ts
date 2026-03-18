import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command } from "@kidd-cli/core";
import { z } from "zod";

import { generatePromptModule, generateRegistry } from "@/lib/prompts/codegen.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runGeneratePipeline } from "@/lib/prompts/pipeline.js";

export const generateArgs = z.object({
  out: z.string().describe("Output directory for generated files"),
  roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
  partials: z.string().optional().describe("Custom partials directory"),
  silent: z.boolean().default(false).describe("Suppress output except errors"),
});

export type GenerateArgs = z.infer<typeof generateArgs>;

/**
 * Shared handler for prompts code generation.
 *
 * @param args - Parsed CLI arguments.
 * @param logger - Logger instance from the command context.
 * @param fail - Failure callback from the command context.
 */
export function handleGenerate(
  args: {
    readonly out: string;
    readonly roots: readonly string[];
    readonly partials?: string;
    readonly silent: boolean;
  },
  logger: {
    info: (msg: string) => void;
    step: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
    success: (msg: string) => void;
  },
  fail: (msg: string) => never,
): void {
  const { out, roots, partials, silent } = args;

  const { discovered, lintResults, prompts } = runGeneratePipeline({ roots, out, partials });

  if (!silent) {
    logger.info(`Found ${discovered} prompt(s)`);
  }

  if (!silent) {
    for (const prompt of prompts) {
      let varList: string;
      // oxlint-disable-next-line unicorn/prefer-ternary -- no-ternary rule forbids ternaries
      if (prompt.schema.length > 0) {
        varList = ` (${prompt.schema.map((v) => v.name).join(", ")})`;
      } else {
        varList = "";
      }
      logger.step(`${prompt.name}${varList}`);
    }
  }

  for (const result of lintResults) {
    for (const diag of result.diagnostics) {
      if (diag.level === "error") {
        logger.error(diag.message);
      } else {
        logger.warn(diag.message);
      }
    }
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

export default command({
  description: "Generate TypeScript modules from .prompt files",
  options: generateArgs,
  handler(ctx) {
    handleGenerate(ctx.args, ctx.logger, ctx.fail);
  },
});
