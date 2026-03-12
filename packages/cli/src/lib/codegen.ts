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

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Escape a template string for embedding inside a JS template literal.
 *
 * Backticks, `${`, and backslashes must be escaped.
 */
function escapeTemplateLiteral(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/**
 * Generate the Zod schema expression for a list of schema variables.
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
  "| Run `pnpm prompts:generate` to regenerate.",
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
    "import { engine } from '@pkg/prompts-sdk'",
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
 */
function buildTree(prompts: readonly ParsedPrompt[]): TreeNode {
  const root: Record<string, unknown> = {};

  for (const prompt of prompts) {
    const importName = toCamelCase(prompt.name);
    const segments = prompt.group ? prompt.group.split("/").map(toCamelCase) : [];

    let current = root;
    for (const segment of segments) {
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
      current = current[segment] as Record<string, unknown>;
    }

    if (typeof current[importName] === "object" && current[importName] !== null) {
      throw new Error(
        `Collision: prompt "${importName}" conflicts with existing group namespace ` +
          `"${importName}" at the same level.`,
      );
    }

    current[importName] = importName;
  }

  return root as TreeNode;
}

/**
 * Serialize a tree node into indented object literal lines.
 *
 * @param node - The tree node to serialize.
 * @param indent - Current indentation level.
 * @returns Array of source lines forming the object literal body.
 */
function serializeTree(node: TreeNode, indent: number): string[] {
  const pad = "  ".repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string") {
      lines.push(`${pad}${key},`);
    } else {
      lines.push(`${pad}${key}: {`);
      lines.push(...serializeTree(value, indent + 1));
      lines.push(`${pad}},`);
    }
  }

  return lines;
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
    "import { createPromptRegistry } from '@pkg/prompts-sdk'",
    imports,
    "",
    "export const prompts = createPromptRegistry({",
    ...treeLines,
    "})",
    "",
  ];

  return lines.join("\n");
}
