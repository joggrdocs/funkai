import { command } from "@kidd-cli/core";

import { generateArgs, handleGenerate } from "./prompts/generate.js";
import { getConfig } from "@/config.js";

export default command({
  description: "Run all code generation across the funkai SDK",
  options: generateArgs,
  handler(ctx) {
    const { silent } = ctx.args;
    const config = getConfig(ctx);

    // --- Prompts codegen ---
    if (!silent) {
      ctx.logger.info("Running prompts code generation...");
    }

    handleGenerate({
      args: {
        silent: ctx.args.silent,
        ...(ctx.args.out !== undefined ? { out: ctx.args.out } : {}),
        ...(ctx.args.includes !== undefined ? { includes: ctx.args.includes } : {}),
        ...(ctx.args.partials !== undefined ? { partials: ctx.args.partials } : {}),
      },
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });

    // --- Future: agents codegen ---
  },
});
