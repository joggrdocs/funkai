import { match } from 'ts-pattern'
import { parse as parseYaml } from 'yaml'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const NAME_RE = /^[a-z0-9-]+$/

/**
 * A variable declared in the frontmatter `schema` block.
 */
export interface SchemaVariable {
  name: string
  type: string
  required: boolean
  description?: string
}

/**
 * Parsed frontmatter from a `.prompt` file.
 */
export interface ParsedFrontmatter {
  name: string
  group?: string
  version?: string
  schema: SchemaVariable[]
}

/**
 * Parse YAML frontmatter from a `.prompt` file's raw content.
 *
 * Extracts `name`, `group`, `version`, and `schema` fields.
 * The `schema` field maps variable names to their type definitions.
 *
 * @param content - Raw file content (including frontmatter fences).
 * @param filePath - File path for error messages.
 * @returns Parsed frontmatter with schema variables.
 * @throws If frontmatter is missing, malformed, or has an invalid name.
 */
export function parseFrontmatter(content: string, filePath: string): ParsedFrontmatter {
  const fmMatch = content.match(FRONTMATTER_RE)
  if (!fmMatch) {
    throw new Error(`No frontmatter found in ${filePath}`)
  }

  const parsed = (() => {
    try {
      return parseYaml(fmMatch[1]) as Record<string, unknown>
    } catch (err) {
      throw new Error(`Failed to parse YAML frontmatter in ${filePath}: ${err}`, { cause: err })
    }
  })()

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Frontmatter is not a valid object in ${filePath}`)
  }

  const name = parsed.name
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`Missing or empty "name" in frontmatter: ${filePath}`)
  }

  if (!NAME_RE.test(name)) {
    throw new Error(
      `Invalid prompt name "${name}" in ${filePath}. ` +
        'Names must be lowercase alphanumeric with hyphens only.'
    )
  }

  const group = match(typeof parsed.group === 'string')
    .with(true, () => parsed.group as string)
    .otherwise(() => undefined)
  const version = match(parsed.version != null)
    .with(true, () => String(parsed.version))
    .otherwise(() => undefined)

  const schema = parseSchemaBlock(parsed.schema, filePath)

  return { name, group, version, schema }
}

/**
 * Parse the `schema` block from frontmatter into an array of variable definitions.
 */
function parseSchemaBlock(raw: unknown, filePath: string): SchemaVariable[] {
  if (raw == null) {
    return []
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(
      `Invalid "schema" in ${filePath}: expected an object mapping variable names to definitions`
    )
  }

  const vars: SchemaVariable[] = []
  const schema = raw as Record<string, unknown>

  for (const [varName, value] of Object.entries(schema)) {
    if (typeof value === 'string') {
      vars.push({ name: varName, type: value, required: true })
      continue
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const def = value as Record<string, unknown>
      const type = match(typeof def.type === 'string')
        .with(true, () => def.type as string)
        .otherwise(() => 'string')
      const required = def.required !== false
      const description = match(typeof def.description === 'string')
        .with(true, () => def.description as string)
        .otherwise(() => undefined)

      vars.push({ name: varName, type, required, description })
      continue
    }

    throw new Error(
      `Invalid schema definition for "${varName}" in ${filePath}. ` +
        'Expected a type string or an object with { type, required?, description? }.'
    )
  }

  return vars
}
