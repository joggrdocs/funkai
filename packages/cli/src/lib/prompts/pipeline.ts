import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { clean, PARTIALS_DIR } from "@funkai/prompts/cli";

import type { ParsedPrompt } from "./codegen.js";
import { extractVariables } from "./extract-variables.js";
import { flattenPartials } from "./flatten.js";
import { parseFrontmatter } from "./frontmatter.js";
import { lintPrompt } from "./lint.js";
import type { LintResult } from "./lint.js";
import { discoverPrompts } from "./paths.js";

/**
 * Resolve the list of partial directories to search.
 *
 * @private
 * @param customDir - Custom partials directory path.
 * @returns Array of directories to search for partials.
 */
// oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: checking custom partials directory from CLI config
function resolvePartialsDirs(customDir: string): readonly string[] {
  if (existsSync(customDir)) {
    return [customDir, PARTIALS_DIR];
  }
  return [PARTIALS_DIR];
}

/**
 * Options for the prompts lint pipeline.
 */
export interface LintPipelineOptions {
  readonly roots: readonly string[];
  readonly partials?: string;
}

/**
 * Result of running the prompts lint pipeline.
 */
export interface LintPipelineResult {
  readonly discovered: number;
  readonly results: readonly LintResult[];
}

/**
 * Run the prompts lint pipeline: discover, parse, and validate .prompt files.
 *
 * @param options - Pipeline configuration.
 * @returns Lint results for all discovered prompts.
 */
export function runLintPipeline(options: LintPipelineOptions): LintPipelineResult {
  const discovered = discoverPrompts([...options.roots]);
  const customPartialsDir = resolve(options.partials ?? ".prompts/partials");
  const partialsDirs = resolvePartialsDirs(customPartialsDir);

  const results = discovered.map((d) => {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
    const raw = readFileSync(d.filePath, "utf8");
    const frontmatter = parseFrontmatter({ content: raw, filePath: d.filePath });
    const template = flattenPartials({ template: clean(raw), partialsDirs });
    const templateVars = extractVariables(template);
    return lintPrompt(frontmatter.name, d.filePath, frontmatter.schema, templateVars);
  });

  return { discovered: discovered.length, results };
}

/**
 * Options for the prompts generate pipeline.
 */
export interface GeneratePipelineOptions {
  readonly roots: readonly string[];
  readonly out: string;
  readonly partials?: string;
}

/**
 * Result of running the prompts generate pipeline.
 */
export interface GeneratePipelineResult {
  readonly discovered: number;
  readonly lintResults: readonly LintResult[];
  readonly prompts: readonly ParsedPrompt[];
}

/**
 * Run the prompts generate pipeline: discover, parse, lint, and prepare prompts for codegen.
 *
 * Does NOT write files — returns the prepared data for the caller to write.
 *
 * @param options - Pipeline configuration.
 * @returns Parsed prompts ready for code generation, along with lint results.
 */
export function runGeneratePipeline(options: GeneratePipelineOptions): GeneratePipelineResult {
  const discovered = discoverPrompts([...options.roots]);
  const customPartialsDir = resolve(options.partials ?? resolve(options.out, "../partials"));
  const partialsDirs = resolvePartialsDirs(customPartialsDir);

  const processed = discovered.map((d) => {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
    const raw = readFileSync(d.filePath, "utf8");
    const frontmatter = parseFrontmatter({ content: raw, filePath: d.filePath });
    const template = flattenPartials({ template: clean(raw), partialsDirs });
    const templateVars = extractVariables(template);

    return {
      lintResult: lintPrompt(frontmatter.name, d.filePath, frontmatter.schema, templateVars),
      prompt: {
        name: frontmatter.name,
        group: frontmatter.group,
        schema: frontmatter.schema,
        template,
        sourcePath: d.filePath,
      } satisfies ParsedPrompt,
    };
  });

  return {
    discovered: discovered.length,
    lintResults: processed.map((p) => p.lintResult),
    prompts: processed.map((p) => p.prompt),
  };
}
