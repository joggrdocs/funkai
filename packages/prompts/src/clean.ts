import { flow } from "es-toolkit";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/**
 * Clean a raw `.prompt` file into a render-ready template.
 *
 * Runs the source through a pipeline of transforms — currently
 * strips frontmatter, with more steps added over time.
 *
 * @param text - Raw `.prompt` file content including frontmatter.
 * @returns The cleaned template string, ready for rendering.
 */
export function clean(text: string): string {
  return pipeline(text);
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Remove YAML frontmatter from the beginning of a string.
 *
 * Frontmatter is a block delimited by `---` at the start of the file.
 * If no frontmatter is present, the string is returned unchanged.
 *
 * @private
 */
function stripFrontmatter(text: string): string {
  return text.replace(FRONTMATTER_RE, "");
}

/** @private */
const pipeline = flow(stripFrontmatter);
