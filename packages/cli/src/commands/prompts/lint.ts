import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runLintPipeline } from "@/lib/prompts/pipeline.js";

/** Zod schema for the `prompts lint` CLI arguments. */
export const lintArgs = z.object({
  roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
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
    readonly roots: readonly string[];
    readonly partials?: string;
    readonly silent: boolean;
  };
  readonly logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
  };
  readonly fail: (msg: string) => never;
}

/**
 * Shared handler for prompts lint/validation.
 *
 * @param params - Handler context with args, logger, and fail callback.
 */
export function handleLint({ args, logger, fail }: HandleLintParams): void {
  const { roots, partials, silent } = args;

  const { discovered, results } = runLintPipeline({ roots, partials });

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
    handleLint({ args: ctx.args, logger: ctx.logger, fail: ctx.fail });
  },
});
