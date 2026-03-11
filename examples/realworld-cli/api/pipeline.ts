import { flowAgent } from "@funkai/agents";
import type { Tool } from "@funkai/agents";
import { z } from "zod";

import type { AnalyzeEvent } from "../shared/types.js";
import { createAnalyzerAgent } from "./agents/analyzer.js";
import { createScannerAgent } from "./agents/scanner.js";

// ---------------------------------------------------------------------------
// Output schemas
// ---------------------------------------------------------------------------

const fileAnalysisSchema = z.object({
  filePath: z.string(),
  summary: z.string(),
});

const pipelineOutputSchema = z.object({
  scannedFiles: z.array(z.string()),
  analyses: z.array(fileAnalysisSchema),
  totalIssues: z.number(),
});

export type PipelineOutput = z.infer<typeof pipelineOutputSchema>;
export type FileAnalysis = z.infer<typeof fileAnalysisSchema>;

// ---------------------------------------------------------------------------
// Pipeline factory
// ---------------------------------------------------------------------------

/**
 * Create the test analysis pipeline flow agent.
 *
 * @param tools - The filesystem tools scoped to the target directory.
 * @param emit - Callback to send SSE events to the client.
 * @returns A flowAgent that scans and analyzes test files.
 */
export const createPipeline = (
  tools: {
    readonly ls: Tool;
    readonly grep: Tool;
    readonly "read-file": Tool;
  },
  emit: (event: AnalyzeEvent) => void,
) =>
  flowAgent(
    {
      name: "test-quality-pipeline",
      input: z.object({
        targetDir: z.string().describe("The directory path being scanned"),
      }),
      output: pipelineOutputSchema,
      onStepStart: ({ step }) => {
        emit({ type: "step:start", stepId: step.id, stepType: step.type });
      },
      onStepFinish: ({ step, duration }) => {
        emit({ type: "step:finish", stepId: step.id, duration });
      },
    },
    async ({ input, $ }) => {
      // -------------------------------------------------------------------
      // Step 1: Scan for test files
      // -------------------------------------------------------------------
      const scannerAgent = createScannerAgent({
        ls: tools.ls,
        grep: tools.grep,
      });

      const scanResult = await $.agent({
        id: "scan-test-files",
        agent: scannerAgent,
        input: `Find all test files. The tools are already scoped to the target directory, so use "." as the root path.`,
        stream: true,
      });

      if (!scanResult.ok) {
        throw new Error(`Scanner failed: ${scanResult.error.message}`);
      }

      const scanOutput = scanResult.value.output as string;
      const testFilePaths = extractTestFilePaths(scanOutput);

      emit({ type: "scan-complete", files: testFilePaths });

      if (testFilePaths.length === 0) {
        return {
          scannedFiles: [],
          analyses: [],
          totalIssues: 0,
        };
      }

      // -------------------------------------------------------------------
      // Step 2: Analyze each test file sequentially
      // -------------------------------------------------------------------
      const analyses: FileAnalysis[] = [];

      await $.each({
        id: "analyze-test-files",
        input: testFilePaths,
        execute: async ({ item: testFilePath }) => {
          const analyzerAgent = createAnalyzerAgent(
            {
              "read-file": tools["read-file"],
              grep: tools.grep,
              ls: tools.ls,
            },
            testFilePath,
          );

          const analysisResult = await $.agent({
            id: `analyze-${sanitizeId(testFilePath)}`,
            agent: analyzerAgent,
            input: `Analyze the test file at ${testFilePath} for quality issues.`,
            stream: true,
          });

          const summary = analysisResult.ok
            ? (analysisResult.value.output as string)
            : `Analysis failed: ${analysisResult.error.message}`;

          analyses.push({ filePath: testFilePath, summary });
          emit({ type: "analysis", filePath: testFilePath, summary });
        },
      });

      const totalIssues = analyses.length;

      return {
        scannedFiles: testFilePaths,
        analyses,
        totalIssues,
      };
    },
  );

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extract test file paths from scanner agent free-form output.
 * Handles paths with or without `./` prefix, and paths wrapped in backticks.
 *
 * @param output - The scanner agent's text output.
 * @returns An array of relative test file paths prefixed with `./`.
 */
const extractTestFilePaths = (output: string): string[] => {
  const pathPattern = /(?:^|[\s`*\-])((?:\.\/)?[^\s`*]+\.(?:test|spec)\.(?:ts|tsx|js|jsx))/gm;
  const matches = [...output.matchAll(pathPattern)];
  return [
    ...new Set(
      matches.map(([, p]) => {
        const trimmed = p.trim();
        return trimmed.startsWith("./") ? trimmed : `./${trimmed}`;
      }),
    ),
  ];
};

/**
 * Sanitize a file path into a valid step ID.
 *
 * @param filePath - A file path to sanitize.
 * @returns A string safe for use as a step ID.
 */
const sanitizeId = (filePath: string): string =>
  filePath.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
