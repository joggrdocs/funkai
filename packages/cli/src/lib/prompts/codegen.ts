import { match } from "ts-pattern";

import type { SchemaVariable } from "./frontmatter.js";

/**
 * Fully parsed prompt ready for code generation.
 */
export interface ParsedPrompt {
  name: string;
  group?: string;
  schema: SchemaVariable[];
  template: string;
  sourcePath: string;
}

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
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
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
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Escape a template string for embedding inside a JS template literal.
 *
 * Backticks, `${`, and backslashes must be escaped.
 *
 * @private
 */
function escapeTemplateLiteral(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/**
 * Generate the Zod schema expression for a list of schema variables.
 *
 * @private
 */
function generateSchemaExpression(vars: SchemaVariable[]): string {
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

const HEADER = [
  "/*",
  "|==========================================================================",
  "| AUTO-GENERATED — DO NOT EDIT",
  "|==========================================================================",
  "|",
  "| Run `funkai prompts generate` to regenerate.",
  "|",
  "*/",
].join("\n");

/**
 * Generate a per-prompt TypeScript module with a default export.
 *
 * The module contains the Zod schema, inlined template, and
 * `render` / `validate` functions.
 */
export function generatePromptModule(prompt: ParsedPrompt): string {
  const escaped = escapeTemplateLiteral(prompt.template);
  const schemaExpr = generateSchemaExpression(prompt.schema);
  const groupValue = match(prompt.group != null)
    .with(true, () => `'${prompt.group}' as const`)
    .otherwise(() => "undefined");

  const lines: string[] = [
    HEADER,
    `// Source: ${prompt.sourcePath}`,
    "",
    "import { z } from 'zod'",
    "import { engine } from '@funkai/prompts'",
    "",
    `const schema = ${schemaExpr}`,
    "",
    "type Variables = z.infer<typeof schema>",
    "",
    `const template = \`${escaped}\``,
    "",
    "export default {",
    `  name: '${prompt.name}' as const,`,
    `  group: ${groupValue},`,
    "  schema,",
    ...match(prompt.schema.length)
      .with(0, () => [
        "  render(variables?: undefined): string {",
        "    return engine.parseAndRenderSync(template, {})",
        "  },",
        "  validate(variables?: undefined): Variables {",
        "    return schema.parse(variables ?? {})",
        "  },",
      ])
      .otherwise(() => [
        "  render(variables: Variables): string {",
        "    return engine.parseAndRenderSync(template, schema.parse(variables))",
        "  },",
        "  validate(variables: unknown): Variables {",
        "    return schema.parse(variables)",
        "  },",
      ]),
    "}",
    "",
  ];

  return lines.join("\n");
}

/**
 * A tree node used during registry code generation.
 * Leaves hold the camelCase import name; branches hold nested nodes.
 */
type TreeNode = {
  readonly [key: string]: string | TreeNode;
};

/**
 * Build a nested tree from sorted prompts, grouped by their `group` field.
 *
 * @param prompts - Sorted parsed prompts.
 * @returns A tree where leaves are import names and branches are group namespaces.
 * @throws If a prompt name collides with a group namespace at the same level.
 *
 * @private
 */
function buildTree(prompts: readonly ParsedPrompt[]): TreeNode {
  return prompts.reduce<Record<string, unknown>>((root, prompt) => {
    const importName = toCamelCase(prompt.name);
    const segments = prompt.group ? prompt.group.split("/").map(toCamelCase) : [];

    const target = segments.reduce<Record<string, unknown>>((current, segment) => {
      const existing = current[segment];
      if (typeof existing === "string") {
        throw new Error(
          `Collision: prompt "${existing}" and group namespace "${segment}" ` +
            "share the same key at the same level.",
        );
      }
      if (existing == null) {
        current[segment] = {};
      }
      return current[segment] as Record<string, unknown>;
    }, root);

    if (typeof target[importName] === "object" && target[importName] !== null) {
      throw new Error(
        `Collision: prompt "${importName}" conflicts with existing group namespace ` +
          `"${importName}" at the same level.`,
      );
    }

    target[importName] = importName;
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
function serializeTree(node: TreeNode, indent: number): string[] {
  const pad = "  ".repeat(indent);

  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${pad}${key},`]
      : [`${pad}${key}: {`, ...serializeTree(value, indent + 1), `${pad}},`],
  );
}

/**
 * Generate the registry `index.ts` that wires all prompt modules
 * together via `createPromptRegistry()`.
 *
 * Prompts are organized into a nested object structure based on their
 * `group` field, with each `/`-separated segment becoming a nesting level.
 */
export function generateRegistry(prompts: ParsedPrompt[]): string {
  const sorted = [...prompts].toSorted((a, b) => a.name.localeCompare(b.name));

  const imports = sorted
    .map((p) => `import ${toCamelCase(p.name)} from './${p.name}.js'`)
    .join("\n");

  const tree = buildTree(sorted);
  const treeLines = serializeTree(tree, 1);

  const lines: string[] = [
    HEADER,
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
