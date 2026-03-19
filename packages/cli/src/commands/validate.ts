import { command } from "@kidd-cli/core";

import { getConfig } from "@/config.js";

import { handleLint, lintArgs } from "./prompts/lint.js";

export default command({
  description: "Run all validations across the funkai SDK",
  options: lintArgs,
  handler(ctx) {
    const { silent } = ctx.args;
    const config = getConfig(ctx);

    // --- Prompts validation ---
    if (!silent) {
      ctx.logger.info("Running prompts validation...");
    }

    handleLint({
      args: ctx.args,
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });

    // --- Future: agents validation ---

    if (!silent) {
      ctx.logger.success("All validations passed.");
    }
  },
});
