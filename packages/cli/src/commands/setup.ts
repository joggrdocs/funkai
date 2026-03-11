import { command } from "@kidd-cli/core";

export default command({
  description: "Set up your project for the funkai SDK",
  async handler(ctx) {
    ctx.logger.intro("funkai — Project Setup");
    ctx.logger.info("Run domain-specific setup commands:");
    ctx.logger.step("funkai prompts setup  — Configure IDE and project for .prompt files");
    ctx.logger.step("funkai agents setup   — (coming soon)");
    ctx.logger.outro("Choose the setup command for your domain.");
  },
});
