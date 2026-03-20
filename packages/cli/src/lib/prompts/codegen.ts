import { match } from "ts-pattern";

import type { SchemaVariable } from "./frontmatter.js";

/**
 * Fully parsed prompt ready for code generation.
 */
export interface ParsedPrompt {
  readonly name: string;
  readonly group?: string;
  readonly schema: readonly SchemaVariable[];
  readonly template: string;
  readonly sourcePath: string;
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Convert a kebab-case name to PascalCase.
 *
 * @param name - Kebab-case string to convert.
 * @returns PascalCase version of the name.
 *
 * @private
 */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

/**
 * Convert a kebab-case name to camelCase.
 *
 * @param name - Kebab-case string to convert.
 * @returns camelCase version of the name.
 *
 * @private
 */
function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}

/**
 * Escape a template string for embedding inside a JS template literal.
 *
 * Backticks, `${`, and backslashes must be escaped.
 *
 * @private
 */
function escapeTemplateLiteral(str: string): string {
  return str
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
}

/** @private */
function formatGroupValue(group: string | undefined): string {
  if (group) {
    return `'${group}' as const`;
  }
  return "undefined";
}

/** @private */
function parseGroupSegments(group: string | undefined): readonly string[] {
  if (group) {
    return group.split("/").map(toCamelCase);
  }
  return [];
}

/**
 * Generate the Zod schema expression for a list of schema variables.
 *
 * @private
 */
function generateSchemaExpression(vars: readonly SchemaVariable[]): string {
  if (vars.length === 0) {
    return "z.object({})";
  }

  const fields = vars
    .map((v) => {
      const base = "z.string()";
      const expr = match(v.required)
        .with(true, () => base)
        .otherwise(() => `${base}.optional()`);
      return `  ${v.name}: ${expr},`;
    })
    .join("\n");

  return `z.object({\n${fields}\n})`;
}

/** @private */
function formatHeader(sourcePath?: string): string {
  let sourceLine = "";
  if (sourcePath) {
    sourceLine = `//  Source:      ${sourcePath}\n`;
  }
  return [
    "// ─── AUTO-GENERATED ────────────────────────────────────────",
    `${sourceLine}//  Regenerate:  funkai prompts generate`,
    "// ───────────────────────────────────────────────────────────",
  ].join("\n");
}

/**
 * Derive a unique file slug from group + name.
 *
 * Ungrouped prompts use the name alone. Grouped prompts
 * join group segments and name with hyphens.
 *
 * @param name - The prompt name (kebab-case).
 * @param group - Optional group path (e.g., 'core/agent').
 * @returns The file slug string.
 *
 * @example
 * ```ts
 * toFileSlug('system', 'core/agent')      // => 'core-agent-system'
 * toFileSlug('greeting', undefined)        // => 'greeting'
 * ```
 */
export function toFileSlug(name: string, group?: string): string {
  if (group) {
    return `${group.replaceAll("/", "-")}-${name}`;
  }
  return name;
}

/**
 * Derive a unique import name (camelCase) from group + name.
 *
 * @param name - The prompt name (kebab-case).
 * @param group - Optional group path (e.g., 'core/agent').
 * @returns The camelCase import identifier.
 *
 * @example
 * ```ts
 * toImportName('system', 'core/agent')     // => 'coreAgentSystem'
 * toImportName('greeting', undefined)       // => 'greeting'
 * ```
 */
export function toImportName(name: string, group?: string): string {
  return toCamelCase(toFileSlug(name, group));
}

/**
 * Generate a per-prompt TypeScript module with a default export.
 *
 * The module uses `createPrompt` from `@funkai/prompts` to
 * encapsulate the Zod schema, inlined template, and render logic.
 *
 * @param prompt - The parsed prompt configuration.
 * @returns The generated TypeScript module source code.
 */
export function generatePromptModule(prompt: ParsedPrompt): string {
  const escaped = escapeTemplateLiteral(prompt.template);
  const schemaExpr = generateSchemaExpression(prompt.schema);
  const groupValue = formatGroupValue(prompt.group);
  const header = formatHeader(prompt.sourcePath);

  const lines: readonly string[] = [
    header,
    "",
    "import { z } from 'zod'",
    "import { createPrompt } from '@funkai/prompts'",
    "",
    `const schema = ${schemaExpr}`,
    "",
    "type Variables = z.infer<typeof schema>",
    "",
    `const template = \`${escaped}\``,
    "",
    "/**",
    ` * **${prompt.name}** prompt module.`,
    ...(prompt.group ? [" *", ` * @group ${prompt.group}`] : []),
    " */",
    "export default createPrompt<Variables>({",
    `  name: '${prompt.name}',`,
    `  group: ${groupValue},`,
    "  template,",
    "  schema,",
    "})",
    "",
  ];

  return lines.join("\n");
}

/**
 * A tree node used during registry code generation.
 * Leaves hold the camelCase import name; branches hold nested nodes.
 */
interface TreeNode {
  readonly [key: string]: string | TreeNode;
}

/**
 * Build a nested tree from sorted prompts, grouped by their `group` field.
 *
 * Leaf values are the unique import name derived from group+name,
 * so prompts with the same name in different groups do not collide.
 *
 * @param prompts - Sorted parsed prompts.
 * @returns A tree where leaves are import names and branches are group namespaces.
 * @throws If a prompt name collides with a group namespace at the same level.
 *
 * @private
 */
function buildTree(prompts: readonly ParsedPrompt[]): TreeNode {
  return prompts.reduce<Record<string, unknown>>((root, prompt) => {
    const leafKey = toCamelCase(prompt.name);
    const importName = toImportName(prompt.name, prompt.group);
    const segments = parseGroupSegments(prompt.group);

    const target = segments.reduce<Record<string, unknown>>((current, segment) => {
      const existing = current[segment];
      if (typeof existing === "string") {
        throw new TypeError(
          `Collision: prompt "${existing}" and group namespace "${segment}" share the same key at the same level.`,
        );
      }
      if (existing === null || existing === undefined) {
        current[segment] = {};
      }
      return current[segment] as Record<string, unknown>;
    }, root);

    if (typeof target[leafKey] === "object" && target[leafKey] !== null) {
      throw new Error(
        `Collision: prompt "${leafKey}" conflicts with existing group namespace "${leafKey}" at the same level.`,
      );
    }

    target[leafKey] = importName;
    return root;
  }, {}) as TreeNode;
}

/**
 * Serialize a tree node into indented object literal lines.
 *
 * @param node - The tree node to serialize.
 * @param indent - Current indentation level.
 * @returns Array of source lines forming the object literal body.
 *
 * @private
 */
function serializeTree(node: TreeNode, indent: number): readonly string[] {
  const pad = "  ".repeat(indent);

  return Object.entries(node).flatMap(([key, value]) =>
    match(typeof value)
      .with("string", () => {
        if (key === value) {
          return [`${pad}${key},`];
        }
        return [`${pad}${key}: ${value as string},`];
      })
      .otherwise(() => [
        `${pad}${key}: {`,
        ...serializeTree(value as TreeNode, indent + 1),
        `${pad}},`,
      ]),
  );
}

/**
 * Generate the registry `index.ts` that wires all prompt modules
 * together via `createPromptRegistry()`.
 *
 * Prompts are organized into a nested object structure based on their
 * `group` field, with each `/`-separated segment becoming a nesting level.
 */
export function generateRegistry(prompts: readonly ParsedPrompt[]): string {
  const sorted = [...prompts].toSorted((a, b) => {
    const slugA = toFileSlug(a.name, a.group);
    const slugB = toFileSlug(b.name, b.group);
    return slugA.localeCompare(slugB);
  });

  const imports = sorted
    .map((p) => {
      const importName = toImportName(p.name, p.group);
      const fileSlug = toFileSlug(p.name, p.group);
      return `import ${importName} from './${fileSlug}.js'`;
    })
    .join("\n");

  const tree = buildTree(sorted);
  const treeLines = serializeTree(tree, 1);
  const header = formatHeader();

  const lines: readonly string[] = [
    header,
    "",
    "import { createPromptRegistry } from '@funkai/prompts'",
    imports,
    "",
    "export const prompts = createPromptRegistry({",
    ...treeLines,
    "})",
    "",
  ];

  return lines.join("\n");
}
