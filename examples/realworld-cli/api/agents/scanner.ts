import { agent } from "@funkai/agents";
import type { Tool } from "@funkai/agents";
import { prompts } from "~prompts";

/**
 * Create the scanner agent that finds test files in a codebase.
 *
 * @param tools - The filesystem tools scoped to the target directory.
 * @returns An agent configured to scan for test files.
 */
export const createScannerAgent = (tools: { readonly ls: Tool; readonly grep: Tool }) =>
  agent({
    name: "scanner",
    model: "openai/gpt-4.1",
    system: prompts.agents.scanner.render({
      fileExtensions: ".test.ts, .spec.ts, .test.js, .spec.js",
    }),
    tools: {
      ls: tools.ls,
      grep: tools.grep,
    },
    maxSteps: 15,
  });
