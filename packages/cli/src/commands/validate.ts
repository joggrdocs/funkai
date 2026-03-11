import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";
import { z } from "zod";

import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runLintPipeline } from "@/lib/prompts/pipeline.js";

export default command({
  description: "Run all validations across the funkai SDK",
  args: z.object({
    roots: z.array(z.string()).describe("Root directories to scan for .prompt files"),
    partials: z.string().optional().describe("Custom partials directory"),
    silent: z.boolean().default(false).describe("Suppress output except errors"),
  }),
  handler(ctx) {
    const { roots, partials, silent } = ctx.args;

    // --- Prompts validation ---
    if (!silent) {
      ctx.logger.info("Running prompts validation...");
    }

    const { discovered, results } = runLintPipeline({ roots, partials });

    if (!silent) {
      ctx.logger.info(`Found ${discovered} prompt(s)`);
    }

    const diagnostics = results.flatMap((result) => result.diagnostics);

    for (const diag of diagnostics) {
      match(diag.level)
        .with("error", () => ctx.logger.error(diag.message))
        .otherwise(() => ctx.logger.warn(diag.message));
    }

    // --- Future: agents validation ---

    if (hasLintErrors([...results])) {
      ctx.fail("Validation errors found.");
    }

    if (!silent) {
      ctx.logger.success("All validations passed.");
    }
  },
});
