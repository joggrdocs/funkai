import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command } from "@kidd-cli/core";
import { match, P } from "ts-pattern";
import { z } from "zod";

import { getConfig } from "@/config.js";

/** @private */
const createTemplate = (name: string) => `---
name: ${name}
---

`;

export default command({
  description: "Create a new .prompt file",
  options: z.object({
    name: z.string().describe("Prompt name (kebab-case)"),
    out: z.string().optional().describe("Output directory (defaults to first root in config or cwd)"),
    partial: z.boolean().default(false).describe("Create as a partial in .prompts/partials/"),
  }),
  handler(ctx) {
    const { name, out, partial } = ctx.args;
    const config = getConfig(ctx);
    const configRoots = config.prompts?.roots;
    const firstRoot = configRoots && configRoots.length > 0 ? configRoots[0] : undefined;

    const dir = match({ partial, out })
      .with({ partial: true }, () => resolve(".prompts/partials"))
      .with({ out: P.string }, ({ out: outDir }) => resolve(outDir))
      .otherwise(() => (firstRoot ? resolve(firstRoot) : process.cwd()));
    const filePath = resolve(dir, `${name}.prompt`);

    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: user-provided CLI argument for prompt file creation
    if (existsSync(filePath)) {
      ctx.fail(`File already exists: ${filePath}`);
    }

    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: directory derived from user CLI path argument
    mkdirSync(dir, { recursive: true });
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: file path derived from user CLI path argument
    writeFileSync(filePath, createTemplate(name), "utf8");

    ctx.logger.success(`Created ${filePath}`);
  },
});
