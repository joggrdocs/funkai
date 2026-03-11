import { agent } from "@funkai/agents";
import type { Tool } from "@funkai/agents";
import { prompts } from "~prompts";

/**
 * Create the analyzer agent that evaluates test file quality.
 *
 * @param tools - The filesystem tools scoped to the target directory.
 * @param testFilePath - The path to the test file being analyzed.
 * @returns An agent configured to analyze test quality.
 */
export const createAnalyzerAgent = (
  tools: {
    readonly "read-file": Tool;
    readonly grep: Tool;
    readonly ls: Tool;
  },
  testFilePath: string,
) =>
  agent({
    name: "analyzer",
    model: "openai/gpt-4.1",
    system: prompts.agents.analyzer.render({
      testFilePath,
    }),
    tools: {
      "read-file": tools["read-file"],
      grep: tools.grep,
      ls: tools.ls,
    },
    maxSteps: 10,
  });
