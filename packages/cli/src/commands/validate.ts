import { command } from "@kidd-cli/core";

import { handleLint, lintArgs } from "./prompts/lint.js";
import { getConfig } from "@/config.js";

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

    const lintHandleArgs: {
      silent: boolean;
      includes?: readonly string[];
      partials?: string;
    } = { silent: ctx.args.silent };
    if (ctx.args.includes !== undefined) {
      lintHandleArgs.includes = ctx.args.includes;
    }
    if (ctx.args.partials !== undefined) {
      lintHandleArgs.partials = ctx.args.partials;
    }
    handleLint({
      args: lintHandleArgs,
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
