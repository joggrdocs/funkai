import { createRequire } from "node:module";

import { cli, command } from "@kidd-cli/core";

import agentsValidate from "@/commands/agents/validate.js";
import generate from "@/commands/generate.js";
import promptsCreate from "@/commands/prompts/create.js";
import promptsGenerate from "@/commands/prompts/generate.js";
import promptsLint from "@/commands/prompts/lint.js";
import promptsSetup from "@/commands/prompts/setup.js";
import setup from "@/commands/setup.js";
import validate from "@/commands/validate.js";
import { configSchema } from "@/config.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { readonly version: string };

await cli({
  description: "CLI for the funkai AI SDK framework",
  name: "funkai",
  version: packageJson.version,
  config: {
    schema: configSchema,
  },
  commands: {
    generate,
    setup,
    validate,
    agents: command({
      description: "Agent-related commands",
      commands: {
        validate: agentsValidate,
      },
    }),
    prompts: command({
      description: "Prompt-related commands",
      commands: {
        create: promptsCreate,
        generate: promptsGenerate,
        lint: promptsLint,
        setup: promptsSetup,
      },
    }),
  },
});
