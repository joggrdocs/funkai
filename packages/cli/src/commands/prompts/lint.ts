import type { FunkaiConfig } from "@funkai/config";
import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { getConfig } from "@/config.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runLintPipeline } from "@/lib/prompts/pipeline.js";

/** Zod schema for the `prompts lint` CLI arguments. */
export const lintArgs = z.object({
  includes: z.array(z.string()).optional().describe("Glob patterns to scan for .prompt files"),
  partials: z.string().optional().describe("Custom partials directory"),
  silent: z.boolean().default(false).describe("Suppress output except errors"),
});

/** Inferred type of the `prompts lint` CLI arguments. */
export type LintArgs = z.infer<typeof lintArgs>;

/**
 * Parameters for the shared lint handler.
 */
export interface HandleLintParams {
  readonly args: {
    readonly includes?: readonly string[];
    readonly partials?: string;
    readonly silent: boolean;
  };
  readonly config?: FunkaiConfig["prompts"];
  readonly logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
  };
  readonly fail: (msg: string) => never;
}

/**
 * Resolve lint args by merging CLI flags with config defaults.
 *
 * @param args - CLI arguments (take precedence).
 * @param config - Prompts config from funkai.config.ts (fallback).
 * @param fail - Error handler for missing required values.
 * @returns Resolved args with required fields guaranteed.
 */
function resolveLintArgs(
  args: HandleLintParams["args"],
  config: FunkaiConfig["prompts"],
  _fail: (msg: string) => never,
): {
  readonly includes: readonly string[];
  readonly excludes: readonly string[];
  readonly partials?: string;
  readonly silent: boolean;
} {
  const includes = args.includes ?? (config && config.includes) ?? ["./**"];
  const excludes = (config && config.excludes) ?? [];
  const partials = args.partials ?? (config && config.partials);

  return { includes, excludes, partials, silent: args.silent };
}

/**
 * Shared handler for prompts lint/validation.
 *
 * @param params - Handler context with args, config, logger, and fail callback.
 */
export function handleLint({ args, config, logger, fail }: HandleLintParams): void {
  const { includes, excludes, partials, silent } = resolveLintArgs(args, config, fail);

  const { discovered, results } = runLintPipeline({ includes, excludes, partials });

  if (!silent) {
    logger.info(`Linting ${discovered} prompt(s)...`);
  }

  const diagnostics = results.flatMap((result) => result.diagnostics);

  for (const diag of diagnostics) {
    match(diag.level)
      .with("error", () => logger.error(diag.message))
      .with("warn", () => logger.warn(diag.message))
      .exhaustive();
  }

  const errorCount = diagnostics.filter((d) => d.level === "error").length;
  const warnCount = diagnostics.filter((d) => d.level !== "error").length;

  if (!silent) {
    const summaryParts: string[] = [`${discovered} prompt(s) linted`];
    if (errorCount > 0) {
      summaryParts.push(`${errorCount} error(s)`);
    }
    if (warnCount > 0) {
      summaryParts.push(`${warnCount} warning(s)`);
    }
    const summary = summaryParts.join(", ");

    logger.info(summary);
  }

  if (hasLintErrors(results)) {
    fail("Lint errors found.");
  }
}

export default command({
  description: "Validate .prompt files for schema/template mismatches",
  options: lintArgs,
  handler(ctx) {
    const config = getConfig(ctx);
    handleLint({
      args: ctx.args,
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });
  },
});
