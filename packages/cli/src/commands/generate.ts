import { command } from "@kidd-cli/core";

import { generateArgs, handleGenerate } from "./prompts/generate.js";

export default command({
  description: "Run all code generation across the funkai SDK",
  options: generateArgs,
  handler(ctx) {
    const { silent } = ctx.args;

    // --- Prompts codegen ---
    if (!silent) {
      ctx.logger.info("Running prompts code generation...");
    }

    handleGenerate({ args: ctx.args, logger: ctx.logger, fail: ctx.fail });

    // --- Future: agents codegen ---
  },
});
