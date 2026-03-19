import { match, P } from "ts-pattern";
import { parse as parseYaml } from "yaml";

/** Regex matching YAML frontmatter fenced by `---` delimiters. */
export const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Regex validating prompt names (lowercase alphanumeric with hyphens). */
export const NAME_RE = /^[a-z0-9-]+$/;

/**
 * Parse raw YAML content into a record, wrapping parse errors
 * with file path context.
 *
 * @param yaml - Raw YAML string to parse.
 * @param filePath - File path for error messages.
 * @returns The parsed YAML as a record.
 *
 * @private
 */
function parseYamlContent(yaml: string, filePath: string): Record<string, unknown> {
  try {
    return parseYaml(yaml) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Failed to parse YAML frontmatter in ${filePath}: ${error}`, { cause: error });
  }
}

/**
 * A variable declared in the frontmatter `schema` block.
 */
export interface SchemaVariable {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description?: string;
}

/**
 * Parsed frontmatter from a `.prompt` file.
 */
export interface ParsedFrontmatter {
  readonly name: string;
  readonly group?: string;
  readonly version?: string;
  readonly schema: readonly SchemaVariable[];
}

/**
 * Parameters for parsing frontmatter from a `.prompt` file.
 */
export interface ParseFrontmatterParams {
  /** Raw file content (including frontmatter fences). */
  readonly content: string;
  /** File path for error messages. */
  readonly filePath: string;
}

/**
 * Parse YAML frontmatter from a `.prompt` file's raw content.
 *
 * Extracts `name`, `group`, `version`, and `schema` fields.
 * The `schema` field maps variable names to their type definitions.
 *
 * @param params - Content and file path to parse.
 * @returns Parsed frontmatter with schema variables.
 * @throws If frontmatter is missing, malformed, or has an invalid name.
 */
export function parseFrontmatter({ content, filePath }: ParseFrontmatterParams): ParsedFrontmatter {
  const fmMatch = content.match(FRONTMATTER_RE);
  if (!fmMatch) {
    throw new Error(`No frontmatter found in ${filePath}`);
  }

  const parsed = parseYamlContent(fmMatch[1], filePath);

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Frontmatter is not a valid object in ${filePath}`);
  }

  const { name } = parsed;
  if (typeof name !== "string" || name.length === 0) {
    throw new Error(`Missing or empty "name" in frontmatter: ${filePath}`);
  }

  if (!NAME_RE.test(name)) {
    throw new Error(
      `Invalid prompt name "${name}" in ${filePath}. ` +
        "Names must be lowercase alphanumeric with hyphens only.",
    );
  }

  const group = parseGroup(parsed.group, filePath);
  const version = parseVersion(parsed.version);

  const schema = parseSchemaBlock(parsed.schema, filePath);

  return { name, group, version, schema };
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/** @private */
function stringOrDefault(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

/** @private */
function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

/**
 * Validate and extract the `group` field from parsed frontmatter.
 *
 * @private
 */
function parseGroup(raw: unknown, filePath: string): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const invalidSegment = raw.split("/").find((segment) => !NAME_RE.test(segment));
  if (invalidSegment !== undefined) {
    throw new Error(
      `Invalid group segment "${invalidSegment}" in ${filePath}. Group segments must be lowercase alphanumeric with hyphens only.`,
    );
  }
  return raw;
}

/**
 * Extract the `version` field from parsed frontmatter.
 *
 * @private
 */
function parseVersion(raw: unknown): string | undefined {
  if (raw != null) {
    return String(raw);
  }
  return undefined;
}

/**
 * Parse the `schema` block from frontmatter into an array of variable definitions.
 *
 * @private
 */
function parseSchemaBlock(raw: unknown, filePath: string): readonly SchemaVariable[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError(
      `Invalid "schema" in ${filePath}: expected an object mapping variable names to definitions`,
    );
  }

  const schema = raw as Record<string, unknown>;

  return Object.entries(schema).map(([varName, value]): SchemaVariable =>
    match(value)
      .with(P.string, (v) => ({ name: varName, type: v, required: true }))
      .with(
        P.when((v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)),
        (def) => {
          const type = stringOrDefault(def.type, "string");
          const required = def.required !== false;
          const description = stringOrUndefined(def.description);
          return { name: varName, type, required, description };
        },
      )
      .otherwise(() => {
        throw new Error(
          `Invalid schema definition for "${varName}" in ${filePath}. ` +
            "Expected a type string or an object with { type, required?, description? }.",
        );
      }),
  );
}
