import { tool } from "@funkai/agents";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Remote tool executor — resolves when the CLI posts back the result
// ---------------------------------------------------------------------------

export type RemoteExecutor = (toolName: string, input: unknown) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Proxy tools — same schemas the agents see, but execute() delegates to the
// CLI over the network via the RemoteExecutor callback.
// ---------------------------------------------------------------------------

/**
 * Create a proxy ls tool that delegates execution to the CLI.
 *
 * @param execute - Callback that sends the tool call to the CLI and awaits the result.
 * @returns A tool with the ls schema whose execute delegates remotely.
 */
export const createLsTool = (execute: RemoteExecutor) =>
  tool({
    description:
      "List files and directories in a given path relative to the project root. Returns file names with type indicators.",
    inputSchema: z.object({
      path: z.string().describe("Relative path from the project root to list. Use '.' for root."),
      recursive: z
        .boolean()
        .optional()
        .describe("When true, list files recursively. Defaults to false."),
    }),
    execute: async (input) => execute("ls", input),
  });

/**
 * Create a proxy grep tool that delegates execution to the CLI.
 *
 * @param execute - Callback that sends the tool call to the CLI and awaits the result.
 * @returns A tool with the grep schema whose execute delegates remotely.
 */
export const createGrepTool = (execute: RemoteExecutor) =>
  tool({
    description:
      "Search for a regex pattern in a file's contents. Returns matching lines with line numbers.",
    inputSchema: z.object({
      filePath: z.string().describe("Relative path to the file to search."),
      pattern: z.string().describe("Regex pattern to search for."),
    }),
    execute: async (input) => execute("grep", input),
  });

/**
 * Create a proxy read-file tool that delegates execution to the CLI.
 *
 * @param execute - Callback that sends the tool call to the CLI and awaits the result.
 * @returns A tool with the read-file schema whose execute delegates remotely.
 */
export const createReadFileTool = (execute: RemoteExecutor) =>
  tool({
    description: "Read the full contents of a file. Returns the file content as a string.",
    inputSchema: z.object({
      filePath: z.string().describe("Relative path to the file to read."),
    }),
    execute: async (input) => execute("read-file", input),
  });
