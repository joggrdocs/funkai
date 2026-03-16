import { command } from "@kidd-cli/core";

import { generateArgs, handleGenerate } from "./prompts/generate.js";

export default command({
  description: "Run all code generation across the funkai SDK",
  args: generateArgs,
  handler(ctx) {
    const { silent } = ctx.args;

    // --- Prompts codegen ---
    if (!silent) {
      ctx.logger.info("Running prompts code generation...");
    }

    handleGenerate(ctx.args, ctx.logger, ctx.fail);

    // --- Future: agents codegen ---
  },
});
