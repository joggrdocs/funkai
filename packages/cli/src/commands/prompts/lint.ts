import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runLintPipeline } from "@/lib/prompts/pipeline.js";

export default command({
  description: "Validate .prompt files for schema/template mismatches",
  args: z.object({
    roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
    partials: z.string().optional().describe("Custom partials directory"),
    silent: z.boolean().default(false).describe("Suppress output except errors"),
  }),
  handler(ctx) {
    const { roots, partials, silent } = ctx.args;

    const { discovered, results } = runLintPipeline({ roots, partials });

    if (!silent) {
      ctx.logger.info(`Linting ${discovered} prompt(s)...`);
    }

    const diagnostics = results.flatMap((result) => result.diagnostics);

    diagnostics.forEach((diag) => {
      if (diag.level === "error") {
        ctx.logger.error(diag.message);
      } else {
        ctx.logger.warn(diag.message);
      }
    });

    const errorCount = diagnostics.filter((d) => d.level === "error").length;
    const warnCount = diagnostics.filter((d) => d.level !== "error").length;

    if (!silent) {
      const summary = [
        `${discovered} prompt(s) linted`,
        match(errorCount > 0)
          .with(true, () => `${errorCount} error(s)`)
          .otherwise(() => undefined),
        match(warnCount > 0)
          .with(true, () => `${warnCount} warning(s)`)
          .otherwise(() => undefined),
      ]
        .filter(Boolean)
        .join(", ");

      ctx.logger.info(summary);
    }

    if (hasLintErrors([...results])) {
      ctx.fail("Lint errors found.");
    }
  },
});
