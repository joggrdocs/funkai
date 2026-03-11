import { command } from "@kidd-cli/core";

export default command({
  description: "Validate agent configurations",
  handler(ctx) {
    ctx.logger.info("Agent validation is not yet available.");
    ctx.logger.info("This command will validate agent configurations and tool schemas.");
  },
});
