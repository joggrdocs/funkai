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

    const generateHandleArgs: {
      silent: boolean;
      out?: string;
      includes?: readonly string[];
      partials?: string;
    } = { silent: ctx.args.silent };
    if (ctx.args.out !== undefined) {
      generateHandleArgs.out = ctx.args.out;
    }
    if (ctx.args.includes !== undefined) {
      generateHandleArgs.includes = ctx.args.includes;
    }
    if (ctx.args.partials !== undefined) {
      generateHandleArgs.partials = ctx.args.partials;
    }
    handleGenerate({
      args: generateHandleArgs,
      config: config.prompts,
      logger: ctx.logger,
      fail: ctx.fail,
    });

    // --- Future: agents codegen ---
  },
});
