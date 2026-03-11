import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { generatePromptModule, generateRegistry } from "@/lib/prompts/codegen.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runGeneratePipeline } from "@/lib/prompts/pipeline.js";

export default command({
  description: "Run all code generation across the funkai SDK",
  args: z.object({
    out: z.string().describe("Output directory for generated files"),
    roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
    partials: z.string().optional().describe("Custom partials directory"),
    silent: z.boolean().default(false).describe("Suppress output except errors"),
  }),
  handler(ctx) {
    const { out, roots, partials, silent } = ctx.args;

    // --- Prompts codegen ---
    if (!silent) {
      ctx.logger.info("Running prompts code generation...");
    }

    const { discovered, lintResults, prompts } = runGeneratePipeline({ roots, out, partials });

    if (!silent) {
      ctx.logger.info(`Found ${discovered} prompt(s)`);
    }

    for (const prompt of prompts) {
      if (!silent) {
        const varCount = prompt.schema.length;
        const varList = match(varCount > 0)
          .with(true, () => ` (${prompt.schema.map((v) => v.name).join(", ")})`)
          .otherwise(() => "");
        ctx.logger.step(`${prompt.name}${varList}`);
      }
    }

    for (const result of lintResults) {
      for (const diag of result.diagnostics) {
        if (diag.level === "error") {
          ctx.logger.error(diag.message);
        } else {
          ctx.logger.warn(diag.message);
        }
      }
    }

    if (hasLintErrors([...lintResults])) {
      ctx.fail("Lint errors found. Fix them before generating.");
    }

    const outDir = resolve(out);
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: output directory from CLI config
    mkdirSync(outDir, { recursive: true });

    for (const prompt of prompts) {
      const content = generatePromptModule(prompt);
      // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated module to output directory
      writeFileSync(resolve(outDir, `${prompt.name}.ts`), content, "utf-8");
    }

    const registryContent = generateRegistry([...prompts]);
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated registry to output directory
    writeFileSync(resolve(outDir, "index.ts"), registryContent, "utf-8");

    // --- Future: agents codegen ---

    if (!silent) {
      ctx.logger.success(`Generated ${prompts.length} prompt module(s) + registry → ${outDir}`);
    }
  },
});
