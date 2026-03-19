import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command } from "@kidd-cli/core";
import { match } from "ts-pattern";

import { setupPrompts } from "@/commands/prompts/setup.js";

/** @private */
const CONFIG_TEMPLATE_AGENTS_ONLY = `import { defineConfig } from "@funkai/config";

export default defineConfig({
  agents: {},
});
`;

export default command({
  description: "Set up your project for the funkai SDK",
  async handler(ctx) {
    ctx.logger.intro("funkai — Project Setup");

    // --- Domain selection ---
    const domains = await ctx.prompts.multiselect({
      message: "Which domains do you want to set up?",
      options: [
        {
          value: "prompts" as const,
          label: "Prompts",
          hint: "LiquidJS templating, codegen, IDE integration",
        },
        { value: "agents" as const, label: "Agents", hint: "Agent scaffolding and configuration" },
      ],
      initialValues: ["prompts" as const],
      required: true,
    });

    const hasPrompts = domains.includes("prompts");
    const hasAgents = domains.includes("agents");

    // --- Create funkai.config.ts ---
    const shouldCreateConfig = await ctx.prompts.confirm({
      message: "Create funkai.config.ts?",
      initialValue: true,
    });

    if (shouldCreateConfig) {
      let roots = ["src/prompts"];
      let out = ".prompts/client";

      if (hasPrompts) {
        const rootsInput = await ctx.prompts.text({
          message: "Prompt root directories (comma-separated)",
          defaultValue: "src/prompts",
          placeholder: "src/prompts",
        });
        roots = rootsInput.split(",").map((r) => r.trim());

        out = await ctx.prompts.text({
          message: "Output directory for generated prompt modules",
          defaultValue: ".prompts/client",
          placeholder: ".prompts/client",
        });
      }

      const template = buildConfigTemplate({ hasPrompts, hasAgents, roots, out });
      const configPath = resolve("funkai.config.ts");
      // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing config file to project root
      writeFileSync(configPath, template, "utf8");
      ctx.logger.success(`Created ${configPath}`);
    }

    // --- Run domain-specific setup ---
    if (hasPrompts) {
      ctx.logger.info("");
      ctx.logger.info("Configuring Prompts...");
      await setupPrompts(ctx);
    }

    if (hasAgents) {
      ctx.logger.info("");
      ctx.logger.info("Agents configuration is not yet available.");
      ctx.logger.info("The agents section has been added to your config for future use.");
    }

    ctx.logger.outro("Project setup complete.");
  },
});

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/** @private */
interface ConfigTemplateOptions {
  readonly hasPrompts: boolean;
  readonly hasAgents: boolean;
  readonly roots: readonly string[];
  readonly out: string;
}

/** @private */
function buildConfigTemplate({ hasPrompts, hasAgents, roots, out }: ConfigTemplateOptions): string {
  if (hasPrompts && hasAgents) {
    return buildCustomTemplate(roots, out, true);
  }
  if (hasPrompts) {
    return buildCustomTemplate(roots, out, false);
  }
  return CONFIG_TEMPLATE_AGENTS_ONLY;
}

/** @private */
function buildCustomTemplate(
  roots: readonly string[],
  out: string,
  includeAgents: boolean,
): string {
  const rootsStr = roots.map((r) => `"${r}"`).join(", ");
  const agentsBlock = match(includeAgents)
    .with(true, () => "\n  agents: {},\n")
    .with(false, () => "\n")
    .exhaustive();

  return `import { defineConfig } from "@funkai/config";

export default defineConfig({
  prompts: {
    roots: [${rootsStr}],
    out: "${out}",
  },${agentsBlock}});
`;
}
