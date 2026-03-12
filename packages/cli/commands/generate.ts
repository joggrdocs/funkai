import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { clean, PARTIALS_DIR } from "@funkai/prompts";
import { generatePromptModule, generateRegistry, type ParsedPrompt } from "@/lib/codegen.js";
import { extractVariables } from "@/lib/extract-variables.js";
import { flattenPartials } from "@/lib/flatten.js";
import { parseFrontmatter } from "@/lib/frontmatter.js";
import { hasLintErrors, lintPrompt, type LintResult } from "@/lib/lint.js";
import { discoverPrompts } from "@/lib/paths.js";

export default command({
  description: "Generate TypeScript modules from .prompt files",
  args: z.object({
    out: z.string().describe("Output directory for generated files"),
    roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
    partials: z.string().optional().describe("Custom partials directory"),
    silent: z.boolean().default(false).describe("Suppress output except errors"),
  }),
  handler(ctx) {
    const { out, roots, partials, silent } = ctx.args;

    const discovered = discoverPrompts([...roots]);

    if (!silent) {
      ctx.logger.info(`Found ${discovered.length} prompt(s)`);
    }

    const customPartialsDir = resolve(partials ?? resolve(out, "../partials"));
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: checking custom partials directory from CLI config
    const partialsDirs = match(existsSync(customPartialsDir))
      .with(true, () => [customPartialsDir, PARTIALS_DIR])
      .otherwise(() => [PARTIALS_DIR]);

    const prompts: ParsedPrompt[] = [];
    const lintResults: LintResult[] = [];

    for (const d of discovered) {
      // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
      const raw = readFileSync(d.filePath, "utf-8");
      const frontmatter = parseFrontmatter(raw, d.filePath);
      const template = flattenPartials(clean(raw), partialsDirs);
      const templateVars = extractVariables(template);

      const result = lintPrompt(frontmatter.name, d.filePath, frontmatter.schema, templateVars);
      lintResults.push(result);

      if (!silent) {
        const varCount = frontmatter.schema.length;
        const varList = match(varCount > 0)
          .with(true, () => ` (${frontmatter.schema.map((v) => v.name).join(", ")})`)
          .otherwise(() => "");
        ctx.logger.step(`${frontmatter.name}${varList}`);
      }

      prompts.push({
        name: frontmatter.name,
        group: frontmatter.group,
        schema: frontmatter.schema,
        template,
        sourcePath: d.filePath,
      });
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

    if (hasLintErrors(lintResults)) {
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

    const registryContent = generateRegistry(prompts);
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated registry to output directory
    writeFileSync(resolve(outDir, "index.ts"), registryContent, "utf-8");

    if (!silent) {
      ctx.logger.success(`Generated ${prompts.length} prompt module(s) + registry → ${outDir}`);
    }
  },
});
