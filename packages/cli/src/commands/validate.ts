import { command } from "@kidd-cli/core";

import { handleLint, lintArgs } from "./prompts/lint.js";

export default command({
  description: "Run all validations across the funkai SDK",
  options: lintArgs,
  handler(ctx) {
    const { silent } = ctx.args;

    // --- Prompts validation ---
    if (!silent) {
      ctx.logger.info("Running prompts validation...");
    }

    handleLint({ args: ctx.args, logger: ctx.logger, fail: ctx.fail });

    // --- Future: agents validation ---

    if (!silent) {
      ctx.logger.success("All validations passed.");
    }
  },
});
