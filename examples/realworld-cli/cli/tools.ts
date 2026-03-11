import { readdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

// ---------------------------------------------------------------------------
// Local tool executors — run on the CLI side against the user's filesystem
// ---------------------------------------------------------------------------

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;

/**
 * Create a map of local tool executors scoped to a base directory.
 *
 * @param baseDir - The absolute path to scope filesystem operations to.
 * @returns A record mapping tool names to their local executor functions.
 */
export const createLocalTools = (baseDir: string): Readonly<Record<string, ToolExecutor>> => ({
  ls: async (input) => {
    const path = input.path as string;
    const recursive = (input.recursive as boolean) ?? false;
    const targetPath = resolve(baseDir, path);
    const entries = await readdir(targetPath, {
      withFileTypes: true,
      recursive,
    });
    return {
      path,
      entries: entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
        path: entry.parentPath
          ? `./${relative(baseDir, entry.parentPath)}/${entry.name}`
          : `./${entry.name}`,
      })),
    };
  },

  grep: async (input) => {
    const filePath = input.filePath as string;
    const pattern = input.pattern as string;
    const fullPath = resolve(baseDir, filePath);
    const content = await readFile(fullPath, "utf-8");
    const regex = new RegExp(pattern, "gi");
    const lines = content.split("\n");
    const matches = lines
      .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
      .filter(({ line }) => regex.test(line));
    return {
      filePath,
      pattern,
      matchCount: matches.length,
      matches,
    };
  },

  "read-file": async (input) => {
    const filePath = input.filePath as string;
    const fullPath = resolve(baseDir, filePath);
    const content = await readFile(fullPath, "utf-8");
    return {
      filePath,
      content,
      lineCount: content.split("\n").length,
    };
  },
});
