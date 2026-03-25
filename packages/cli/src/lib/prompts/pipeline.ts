import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { PromptGroup } from "@funkai/config";
import { clean, PARTIALS_DIR } from "@funkai/prompts/cli";
import { isNil } from "es-toolkit";
import picomatch from "picomatch";

import { toFileSlug } from "./codegen.js";
import type { ParsedPrompt } from "./codegen.js";
import { extractVariables } from "./extract-variables.js";
import { flattenPartials } from "./flatten.js";
import { parseFrontmatter } from "./frontmatter.js";
import type { SchemaVariable } from "./frontmatter.js";
import { lintPrompt } from "./lint.js";
import type { LintResult } from "./lint.js";
import { discoverPrompts } from "./paths.js";

/**
 * Validate that no two prompts share the same group+name combination.
 *
 * @param prompts - Parsed prompts with group and name fields.
 * @throws If duplicate group+name combinations are found.
 *
 * @private
 */
function validateUniqueness(prompts: readonly ParsedPrompt[]): void {
  const bySlug = Map.groupBy(prompts, (p) => toFileSlug(p.name, p.group));
  const duplicate = [...bySlug.entries()].find(([, entries]) => entries.length > 1);

  if (duplicate) {
    const [slug, entries] = duplicate;
    const paths = entries.map((p) => p.sourcePath).join("\n  ");
    throw new Error(`Duplicate prompt "${slug}" (group+name) found in:\n  ${paths}`);
  }
}

/**
 * Resolve a prompt's group from config-defined group patterns.
 *
 * Matches the prompt's file path against each group's `includes`/`excludes`
 * patterns. First matching group wins.
 *
 * @param filePath - Absolute path to the prompt file.
 * @param groups - Config-defined group definitions.
 * @returns The matching group name, or undefined if no match.
 *
 * @private
 */
function resolveGroupFromConfig(
  filePath: string,
  groups: readonly PromptGroup[],
): string | undefined {
  const matchPath = relative(process.cwd(), filePath).replaceAll("\\", "/");

  const matched = groups.find((group) => {
    const isIncluded = picomatch(group.includes as string[]);
    const isExcluded = picomatch((group.excludes ?? []) as string[]);
    return isIncluded(matchPath) && !isExcluded(matchPath);
  });

  if (isNil(matched)) {
    return undefined;
  }

  return matched.name;
}

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
  readonly includes: readonly string[];
  readonly excludes?: readonly string[];
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
  const discoverLintOptions: {
    includes: string[];
    excludes?: string[];
  } = { includes: [...options.includes] };
  if (options.excludes !== undefined) {
    discoverLintOptions.excludes = [...options.excludes];
  }
  const discovered = discoverPrompts(discoverLintOptions);
  const customPartialsDir = resolve(options.partials ?? ".prompts/partials");
  const partialsDirs = resolvePartialsDirs(customPartialsDir);

  const results = discovered.map((d) => {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
    const raw = readFileSync(d.filePath, "utf8");
    const frontmatter = parseFrontmatter({ content: raw, filePath: d.filePath });
    const template = flattenPartials({ template: clean(raw), partialsDirs });
    const templateVars = extractVariables(template);
    return lintPrompt({ name: frontmatter.name, filePath: d.filePath, schemaVars: frontmatter.schema, templateVars });
  });

  return { discovered: discovered.length, results };
}

/**
 * Options for the prompts generate pipeline.
 */
export interface GeneratePipelineOptions {
  readonly includes: readonly string[];
  readonly excludes?: readonly string[];
  readonly out: string;
  readonly partials?: string;
  readonly groups?: readonly PromptGroup[];
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
  const discoverGenerateOptions: {
    includes: string[];
    excludes?: string[];
  } = { includes: [...options.includes] };
  if (options.excludes !== undefined) {
    discoverGenerateOptions.excludes = [...options.excludes];
  }
  const discovered = discoverPrompts(discoverGenerateOptions);
  const customPartialsDir = resolve(options.partials ?? resolve(options.out, "../partials"));
  const partialsDirs = resolvePartialsDirs(customPartialsDir);
  const configGroups = options.groups ?? [];

  const processed = discovered.map((d) => {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
    const raw = readFileSync(d.filePath, "utf8");
    const frontmatter = parseFrontmatter({ content: raw, filePath: d.filePath });
    const template = flattenPartials({ template: clean(raw), partialsDirs });
    const templateVars = extractVariables(template);

    // Frontmatter group wins; fall back to config-defined group patterns
    const group = frontmatter.group ?? resolveGroupFromConfig(d.filePath, configGroups);

    const promptObj: {
      name: string;
      schema: readonly SchemaVariable[];
      template: string;
      sourcePath: string;
      group?: string;
    } = {
      name: frontmatter.name,
      schema: frontmatter.schema,
      template,
      sourcePath: d.filePath,
    };
    if (group !== undefined) {
      promptObj.group = group;
    }
    return {
      lintResult: lintPrompt({ name: frontmatter.name, filePath: d.filePath, schemaVars: frontmatter.schema, templateVars }),
      prompt: promptObj satisfies ParsedPrompt,
    };
  });

  const prompts = processed.map((p) => p.prompt);
  validateUniqueness(prompts);

  return {
    discovered: discovered.length,
    lintResults: processed.map((p) => p.lintResult),
    prompts,
  };
}
