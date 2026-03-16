import { command } from "@kidd-cli/core";
import { z } from "zod";

import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runLintPipeline } from "@/lib/prompts/pipeline.js";

export const lintArgs = z.object({
  roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
  partials: z.string().optional().describe("Custom partials directory"),
  silent: z.boolean().default(false).describe("Suppress output except errors"),
});

export type LintArgs = z.infer<typeof lintArgs>;

/**
 * Shared handler for prompts lint/validation.
 *
 * @param args - Parsed CLI arguments.
 * @param logger - Logger instance from the command context.
 * @param fail - Failure callback from the command context.
 */
export function handleLint(
  args: { readonly roots: readonly string[]; readonly partials?: string; readonly silent: boolean },
  logger: { info: (msg: string) => void; error: (msg: string) => void; warn: (msg: string) => void },
  fail: (msg: string) => never,
): void {
  const { roots, partials, silent } = args;

  const { discovered, results } = runLintPipeline({ roots, partials });

  if (!silent) {
    logger.info(`Linting ${discovered} prompt(s)...`);
  }

  const diagnostics = results.flatMap((result) => result.diagnostics);

  for (const diag of diagnostics) {
    if (diag.level === "error") {
      logger.error(diag.message);
    } else {
      logger.warn(diag.message);
    }
  }

  const errorCount = diagnostics.filter((d) => d.level === "error").length;
  const warnCount = diagnostics.filter((d) => d.level !== "error").length;

  if (!silent) {
    const summary = [
      `${discovered} prompt(s) linted`,
      errorCount > 0 ? `${errorCount} error(s)` : undefined,
      warnCount > 0 ? `${warnCount} warning(s)` : undefined,
    ]
      .filter(Boolean)
      .join(", ");

    logger.info(summary);
  }

  if (hasLintErrors(results)) {
    fail("Lint errors found.");
  }
}

export default command({
  description: "Validate .prompt files for schema/template mismatches",
  args: lintArgs,
  handler(ctx) {
    handleLint(ctx.args, ctx.logger, ctx.fail);
  },
});
