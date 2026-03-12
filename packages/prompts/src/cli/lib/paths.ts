import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'

const MAX_DEPTH = 5
const PROMPT_EXT = '.prompt'
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const NAME_RE = /^[a-z0-9-]+$/

export interface DiscoveredPrompt {
  name: string
  filePath: string
}

/**
 * Extract the `name` field from YAML frontmatter.
 *
 * This is a lightweight extraction that avoids pulling in a full YAML parser.
 * It looks for `name: <value>` in the frontmatter block.
 */
function extractName(content: string): string | undefined {
  const match = content.match(FRONTMATTER_RE)
  if (!match) {
    return undefined
  }

  const frontmatter = match[1]
  const nameLine = frontmatter.split('\n').find((line) => line.startsWith('name:'))
  if (!nameLine) {
    return undefined
  }

  return nameLine.slice('name:'.length).trim()
}

/**
 * Derive a prompt name from a file path when no frontmatter name is present.
 *
 * If the file is named `prompt.prompt`, uses the parent directory name.
 * Otherwise uses the file stem (e.g. `my-agent.prompt` -> `my-agent`).
 */
function deriveNameFromPath(filePath: string): string {
  const stem = basename(filePath, PROMPT_EXT)
  if (stem === 'prompt') {
    return basename(resolve(filePath, '..'))
  }
  return stem
}

/**
 * Recursively scan a directory for `.prompt` files.
 */
function scanDirectory(dir: string, depth: number): DiscoveredPrompt[] {
  if (depth > MAX_DEPTH) {
    return []
  }
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: directory traversal for prompt discovery
  if (!existsSync(dir)) {
    return []
  }

  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: stat check on traversed directory
  const stat = lstatSync(dir)
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return []
  }

  const results: DiscoveredPrompt[] = []
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading entries from traversed directory
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isSymbolicLink()) {
      continue
    }

    if (entry.isFile() && extname(entry.name) === PROMPT_EXT) {
      // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading prompt file content for name extraction
      const content = readFileSync(fullPath, 'utf-8')
      const name = extractName(content) ?? deriveNameFromPath(fullPath)

      if (!NAME_RE.test(name)) {
        throw new Error(
          `Invalid prompt name "${name}" from ${fullPath}. ` +
            'Names must be lowercase alphanumeric with hyphens only.'
        )
      }

      results.push({ name, filePath: fullPath })
    }

    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath, depth + 1))
    }
  }

  return results
}

/**
 * Discover all `.prompt` files from the given root directories.
 *
 * @param roots - Directories to scan recursively.
 * @returns Sorted, deduplicated list of discovered prompts.
 * @throws If duplicate prompt names are found across roots.
 */
export function discoverPrompts(roots: string[]): DiscoveredPrompt[] {
  const all: DiscoveredPrompt[] = []

  for (const root of roots) {
    const resolved = resolve(root)
    all.push(...scanDirectory(resolved, 0))
  }

  const byName = new Map<string, DiscoveredPrompt[]>()
  for (const prompt of all) {
    const existing = byName.get(prompt.name)
    if (existing) {
      existing.push(prompt)
    } else {
      byName.set(prompt.name, [prompt])
    }
  }

  for (const [name, prompts] of byName) {
    if (prompts.length > 1) {
      const paths = prompts.map((p) => p.filePath).join('\n  ')
      throw new Error(`Duplicate prompt name "${name}" found in:\n  ${paths}`)
    }
  }

  return all.toSorted((a, b) => a.name.localeCompare(b.name))
}
