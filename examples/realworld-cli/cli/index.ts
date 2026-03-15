import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import * as p from "@clack/prompts";

import type { AnalyzeEvent, ToolResultPayload } from "../shared/types.js";
import { createLocalTools } from "./tools.js";

// ---------------------------------------------------------------------------
// 1. CLI intro and input
// ---------------------------------------------------------------------------

p.intro("Test Quality Analyzer");

const targetInput = await p.text({
  message: "Which directory should I scan for tests?",
  placeholder: "./fixtures",
  defaultValue: "./fixtures",
  validate: (value = "") => {
    if (value.trim().length === 0) return "Please enter a directory path.";
    return undefined;
  },
});

if (p.isCancel(targetInput)) {
  p.cancel("Cancelled.");
  process.exit(0);
}

const apiUrl = process.env.API_URL ?? "http://localhost:4321";
const baseDir = resolve(process.cwd(), targetInput);

p.log.info(`Target directory: ${baseDir}`);

// ---------------------------------------------------------------------------
// 2. Create local tool executors
// ---------------------------------------------------------------------------

const localTools = createLocalTools(baseDir);

// ---------------------------------------------------------------------------
// 3. Start the analysis via the API
// ---------------------------------------------------------------------------

const spinner = p.spinner();
spinner.start("Connecting to analysis server...");

let response: Response;
try {
  response = await fetch(`${apiUrl}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetDir: targetInput }),
  });
} catch {
  spinner.stop("Connection failed.");
  p.log.error(`Could not connect to the API server at ${apiUrl}. Is it running?`);
  p.outro("Exited with errors.");
  process.exit(1);
}

if (!response.ok) {
  spinner.stop("Request failed.");
  const text = await response.text();
  p.log.error(`API error (${response.status}): ${text}`);
  p.outro("Exited with errors.");
  process.exit(1);
}

spinner.message("Scanning for test files...");

// ---------------------------------------------------------------------------
// 4. Consume SSE stream and execute tools locally
// ---------------------------------------------------------------------------

const analyses: Array<{ filePath: string; summary: string }> = [];
let scannedFiles: readonly string[] = [];
let totalIssues = 0;

const body = response.body;
if (!body) {
  spinner.stop("No response body.");
  p.outro("Exited with errors.");
  process.exit(1);
}

/**
 * Execute a tool locally and POST the result back to the API.
 */
const executeToolLocally = async (
  callId: string,
  toolName: string,
  input: unknown,
): Promise<void> => {
  const executor = localTools[toolName];
  const payload: ToolResultPayload = executor
    ? await executor(input as Record<string, unknown>)
        .then((output) => ({ callId, output }))
        .catch((err: Error) => ({ callId, output: null, error: err.message }))
    : { callId, output: null, error: `Unknown tool: ${toolName}` };

  if (payload.error) {
    p.log.error(`${toolName} failed: ${payload.error}`);
  } else {
    p.log.info(`${toolName} result: ${JSON.stringify(payload.output, null, 2)}`);
  }

  await fetch(`${apiUrl}/tool-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

const decoder = new TextDecoder();
let buffer = "";
let spinnerActive = true;
let isStreamingText = false;

const stopSpinnerIfActive = (msg?: string): void => {
  if (spinnerActive) {
    spinner.stop(msg ?? "");
    spinnerActive = false;
  }
};

const endTextStream = (): void => {
  if (isStreamingText) {
    process.stdout.write("\n");
    isStreamingText = false;
  }
};

for await (const chunk of body) {
  buffer += decoder.decode(chunk, { stream: true });

  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;

    const data = line.slice(5).trim();
    if (data.length === 0) continue;

    let event: AnalyzeEvent;
    try {
      event = JSON.parse(data) as AnalyzeEvent;
    } catch {
      continue;
    }

    switch (event.type) {
      case "tool-execute":
        endTextStream();
        stopSpinnerIfActive();
        p.log.info(`exec ${event.toolName}(${JSON.stringify(event.input)})`);
        executeToolLocally(event.callId, event.toolName, event.input);
        break;

      case "step:start":
        endTextStream();
        if (event.stepId === "scan-test-files") {
          if (!spinnerActive) {
            spinner.start("Scanning for test files...");
            spinnerActive = true;
          }
        } else if (event.stepId.startsWith("analyze-")) {
          stopSpinnerIfActive();
          const fileName = event.stepId.replace("analyze-", "").replace(/-+/g, "/");
          p.log.message(`--- Analyzing: ${fileName} ---`);
        }
        break;

      case "scan-complete":
        endTextStream();
        stopSpinnerIfActive(`Found ${event.files.length} test file(s).`);
        for (const file of event.files) {
          p.log.info(`  ${file}`);
        }
        break;

      case "analysis":
        endTextStream();
        analyses.push({
          filePath: event.filePath,
          summary: event.summary,
        });
        break;

      case "done":
        endTextStream();
        scannedFiles = event.scannedFiles;
        totalIssues = event.totalIssues;
        break;

      case "error":
        endTextStream();
        stopSpinnerIfActive("Error occurred.");
        p.log.error(event.message);
        break;

      case "tool-call":
        // Displayed via tool-execute events
        break;

      case "text-delta":
        stopSpinnerIfActive();
        process.stdout.write(event.text);
        isStreamingText = true;
        break;

      case "step:finish":
        endTextStream();
        p.log.info(`Step ${event.stepId} completed (${(event.duration / 1000).toFixed(1)}s)`);
        break;
    }
  }
}

// Flush any remaining buffered data (e.g. the done event at end-of-stream)
if (buffer.trim().length > 0) {
  for (const line of buffer.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (data.length === 0) continue;
    try {
      const evt = JSON.parse(data) as AnalyzeEvent;
      if (evt.type === "done") {
        scannedFiles = evt.scannedFiles;
        totalIssues = evt.totalIssues;
      }
    } catch {
      // ignore parse errors
    }
  }
}

// Fallback: derive scanned files from collected analyses if done event was missed
if (scannedFiles.length === 0 && analyses.length > 0) {
  scannedFiles = analyses.map((a) => a.filePath);
  totalIssues = analyses.length;
}

endTextStream();
if (spinnerActive) {
  spinner.stop("Analysis complete.");
  spinnerActive = false;
} else {
  p.log.success("Analysis complete.");
}

// ---------------------------------------------------------------------------
// 5. Display results
// ---------------------------------------------------------------------------

if (analyses.length === 0) {
  p.log.warning("No test files found in the specified directory.");
  p.outro("Done — no tests to analyze.");
  process.exit(0);
}

for (const analysis of analyses) {
  p.note(analysis.summary, analysis.filePath);
}

// ---------------------------------------------------------------------------
// 6. Write report
// ---------------------------------------------------------------------------

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
const reportsDir = resolve(process.cwd(), "reports");
const reportPath = resolve(reportsDir, `${timestamp}.md`);

const reportLines = [
  "# Test Quality Report",
  "",
  `**Date:** ${now.toLocaleString()}`,
  `**Directory:** ${baseDir}`,
  `**Files scanned:** ${scannedFiles.length}`,
  `**Total issues:** ${totalIssues}`,
  "",
  "---",
  "",
];

for (const analysis of analyses) {
  reportLines.push(`## ${analysis.filePath}`, "", analysis.summary, "", "---", "");
}

await mkdir(reportsDir, { recursive: true });
await writeFile(reportPath, reportLines.join("\n"), "utf-8");

p.log.success(`Report written to ${reportPath}`);

const summaryMessage = `Analyzed ${scannedFiles.length} test file(s) — ${totalIssues} issue(s) found.`;

p.outro(summaryMessage);
