import { flow } from 'es-toolkit'

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

/**
 * Remove YAML frontmatter from the beginning of a string.
 *
 * Frontmatter is a block delimited by `---` at the start of the file.
 * If no frontmatter is present, the string is returned unchanged.
 */
function stripFrontmatter(text: string): string {
  return text.replace(FRONTMATTER_RE, '')
}

const pipeline = flow(stripFrontmatter)

/**
 * Clean a raw `.prompt` file into a render-ready template.
 *
 * Runs the source through a pipeline of transforms — currently
 * strips frontmatter, with more steps added over time.
 */
export function clean(text: string): string {
  return pipeline(text)
}
