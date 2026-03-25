import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

import picomatch from "picomatch";
import { parse as parseYaml } from "yaml";

import { FRONTMATTER_RE, NAME_RE } from "./frontmatter.js";

const MAX_DEPTH = 5;
const PROMPT_EXT = ".prompt";

/** A `.prompt` file discovered during directory scanning. */
export interface DiscoveredPrompt {
  readonly name: string;
  readonly filePath: string;
}

/**
 * Options for prompt discovery.
 */
export interface DiscoverPromptsOptions {
  /** Glob patterns to scan for `.prompt` files (defaults to `['./**']`). */
  readonly includes: readonly string[];
  /** Glob patterns to exclude from discovery. */
  readonly excludes?: readonly string[];
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Extract the `name` field from YAML frontmatter.
 *
 * Uses a proper YAML parser to handle quoted values and edge cases.
 *
 * @private
 */
function extractName(content: string): string | undefined {
  const fmMatch = content.match(FRONTMATTER_RE);
  if (!fmMatch) {
    return undefined;
  }

  try {
    const [, fmContent] = fmMatch;
    if (fmContent === undefined) {
      return undefined;
    }
    const parsed = parseYaml(fmContent) as Record<string, unknown> | null;
    if (parsed !== null && parsed !== undefined && typeof parsed["name"] === "string") {
      return parsed["name"];
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Derive a prompt name from a file path when no frontmatter name is present.
 *
 * If the file is named `prompt.prompt`, uses the parent directory name.
 * Otherwise uses the file stem (e.g. `my-agent.prompt` -> `my-agent`).
 *
 * @private
 */
function deriveNameFromPath(filePath: string): string {
  const stem = basename(filePath, PROMPT_EXT);
  if (stem === "prompt") {
    return basename(resolve(filePath, ".."));
  }
  return stem;
}

/**
 * Extract the static base directory from a glob pattern.
 *
 * Returns the longest directory prefix before any glob characters
 * (`*`, `?`, `{`, `[`). Falls back to `'.'` if the pattern starts
 * with a glob character.
 *
 * @private
 */
function extractBaseDir(pattern: string): string {
  const globChars = new Set(["*", "?", "{", "["]);
  const parts = pattern.split("/");
  const firstGlobIndex = parts.findIndex((part) => [...part].some((ch) => globChars.has(ch)));
  const staticParts = firstGlobIndex === -1 ? parts : parts.slice(0, firstGlobIndex);

  if (staticParts.length === 0) {
    return ".";
  }

  return staticParts.join("/");
}

/**
 * Recursively scan a directory for `.prompt` files.
 *
 * @private
 */
function scanDirectory(dir: string, depth: number): DiscoveredPrompt[] {
  if (depth > MAX_DEPTH) {
    return [];
  }
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: directory traversal for prompt discovery
  if (!existsSync(dir)) {
    return [];
  }

  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: stat check on traversed directory
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return [];
  }

  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading entries from traversed directory
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries
    .filter((entry) => !entry.isSymbolicLink())
    .flatMap((entry): DiscoveredPrompt[] => {
      const fullPath = join(dir, entry.name);

      if (entry.isFile() && extname(entry.name) === PROMPT_EXT) {
        // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading prompt file content for name extraction
        const content = readFileSync(fullPath, "utf8");
        const name = extractName(content) ?? deriveNameFromPath(fullPath);

        if (!NAME_RE.test(name)) {
          throw new Error(
            `Invalid prompt name "${name}" from ${fullPath}. ` +
              "Names must be lowercase alphanumeric with hyphens only.",
          );
        }

        return [{ name, filePath: fullPath }];
      }

      if (entry.isDirectory()) {
        return scanDirectory(fullPath, depth + 1);
      }

      return [];
    });
}

/**
 * Discover all `.prompt` files matching the given include/exclude patterns.
 *
 * Extracts base directories from the include patterns, scans them
 * recursively, then filters results through picomatch.
 *
 * Name uniqueness is **not** enforced here — prompts with the same name
 * are allowed as long as they belong to different groups. Uniqueness
 * is validated downstream in the pipeline after frontmatter parsing,
 * where group information is available.
 *
 * @param options - Include and exclude glob patterns.
 * @returns Sorted list of discovered prompts.
 */
export function discoverPrompts(options: DiscoverPromptsOptions): readonly DiscoveredPrompt[] {
  const { includes, excludes = [] } = options;

  const baseDirs = [...new Set(includes.map((pattern) => resolve(extractBaseDir(pattern))))];
  const all = baseDirs.flatMap((dir) => scanDirectory(dir, 0));

  const isIncluded = picomatch(includes as string[]);
  const isExcluded = picomatch(excludes as string[]);

  const filtered = all.filter((prompt) => {
    const matchPath = relative(process.cwd(), prompt.filePath).replaceAll("\\", "/");
    return isIncluded(matchPath) && !isExcluded(matchPath);
  });

  const deduped = [
    ...new Map(filtered.map((prompt) => [prompt.filePath, prompt] as const)).values(),
  ];

  return deduped.toSorted((a, b) => a.name.localeCompare(b.name));
}
