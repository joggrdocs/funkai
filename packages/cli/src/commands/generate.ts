import { command } from "@kidd-cli/core";

import { getConfig } from "@/config.js";

import { generateArgs, handleGenerate } from "./prompts/generate.js";

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
      args: ctx.args,
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });

    // --- Future: agents codegen ---
  },
});
