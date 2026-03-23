import { openai } from "@ai-sdk/openai";
import { agent, evolve } from "@funkai/agents";
import type { Agent, Tool } from "@funkai/agents";
import { prompts } from "~prompts";

/**
 * Base analyzer agent — evaluates test file quality.
 *
 * Uses `evolve()` to create per-file variants with scoped system prompts.
 */
const baseAnalyzer = agent({
  name: "analyzer",
  model: openai("gpt-4.1"),
  system: "You analyze test files for quality issues.",
  maxSteps: 10,
});

/**
 * Create the analyzer agent that evaluates test file quality.
 *
 * Evolves from `baseAnalyzer` — overrides the system prompt with
 * the file-specific rendered template and injects scoped tools.
 *
 * @param tools - The filesystem tools scoped to the target directory.
 * @param testFilePath - The path to the test file being analyzed.
 * @returns An agent configured to analyze test quality.
 *
 * @example
 * ```ts
 * const analyzer = createAnalyzerAgent(fsTools, "src/foo.test.ts")
 * const result = await analyzer.generate({ prompt: "Review this test file" })
 * ```
 */
export const createAnalyzerAgent = (
  tools: {
    readonly "read-file": Tool;
    readonly grep: Tool;
    readonly ls: Tool;
  },
  testFilePath: string,
): Agent =>
  evolve(baseAnalyzer, {
    system: prompts.agents.analyzer.render({
      testFilePath,
    }),
    tools: {
      "read-file": tools["read-file"],
      grep: tools.grep,
      ls: tools.ls,
    },
  });
