import { match } from 'ts-pattern'

import type { SchemaVariable } from './frontmatter.js'

/**
 * Fully parsed prompt ready for code generation.
 */
export interface ParsedPrompt {
  name: string
  group?: string
  schema: SchemaVariable[]
  template: string
  sourcePath: string
}

function toPascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * Escape a template string for embedding inside a JS template literal.
 *
 * Backticks, `${`, and backslashes must be escaped.
 */
function escapeTemplateLiteral(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

/**
 * Generate the Zod schema expression for a list of schema variables.
 */
function generateSchemaExpression(vars: SchemaVariable[]): string {
  if (vars.length === 0) {
    return 'z.object({})'
  }

  const fields = vars
    .map((v) => {
      const base = 'z.string()'
      const expr = match(v.required)
        .with(true, () => base)
        .otherwise(() => `${base}.optional()`)
      return `  ${v.name}: ${expr},`
    })
    .join('\n')

  return `z.object({\n${fields}\n})`
}

const HEADER = [
  '/*',
  '|==========================================================================',
  '| AUTO-GENERATED — DO NOT EDIT',
  '|==========================================================================',
  '|',
  '| Run `pnpm prompts:generate` to regenerate.',
  '|',
  '*/',
].join('\n')

/**
 * Generate a per-prompt TypeScript module with a default export.
 *
 * The module contains the Zod schema, inlined template, and
 * `render` / `validate` functions.
 */
export function generatePromptModule(prompt: ParsedPrompt): string {
  const escaped = escapeTemplateLiteral(prompt.template)
  const schemaExpr = generateSchemaExpression(prompt.schema)
  const groupValue = match(prompt.group != null)
    .with(true, () => `'${prompt.group}' as const`)
    .otherwise(() => 'undefined')

  const lines: string[] = [
    HEADER,
    `// Source: ${prompt.sourcePath}`,
    '',
    "import { z } from 'zod'",
    "import { engine } from '@pkg/prompts-sdk'",
    '',
    `const schema = ${schemaExpr}`,
    '',
    'type Variables = z.infer<typeof schema>',
    '',
    `const template = \`${escaped}\``,
    '',
    'export default {',
    `  name: '${prompt.name}' as const,`,
    `  group: ${groupValue},`,
    '  schema,',
    ...match(prompt.schema.length)
      .with(0, () => [
        '  render(variables?: undefined): string {',
        '    return engine.parseAndRenderSync(template, {})',
        '  },',
        '  validate(variables?: undefined): Variables {',
        '    return schema.parse(variables ?? {})',
        '  },',
      ])
      .otherwise(() => [
        '  render(variables: Variables): string {',
        '    return engine.parseAndRenderSync(template, schema.parse(variables))',
        '  },',
        '  validate(variables: unknown): Variables {',
        '    return schema.parse(variables)',
        '  },',
      ]),
    '}',
    '',
  ]

  return lines.join('\n')
}

/**
 * Generate the registry `index.ts` that wires all prompt modules
 * together via `createPromptRegistry()`.
 */
export function generateRegistry(prompts: ParsedPrompt[]): string {
  const sorted = [...prompts].toSorted((a, b) => a.name.localeCompare(b.name))

  const imports = sorted
    .map((p) => `import ${toCamelCase(p.name)} from './${p.name}.js'`)
    .join('\n')

  const registryEntries = sorted.map((p) => `  '${p.name}': ${toCamelCase(p.name)},`).join('\n')

  const promptMapEntries = sorted
    .map((p) => `  '${p.name}': typeof ${toCamelCase(p.name)}`)
    .join('\n')

  const lines: string[] = [
    HEADER,
    '',
    "import { createPromptRegistry } from '@pkg/prompts-sdk'",
    imports,
    '',
    'const registry = createPromptRegistry({',
    registryEntries,
    '})',
    '',
    'interface PromptMap {',
    promptMapEntries,
    '}',
    '',
    'export type PromptName = keyof PromptMap',
    '',
    'export type Prompt<K extends PromptName> = PromptMap[K]',
    '',
    'export function prompts<K extends PromptName>(name: K): Prompt<K> {',
    '  return registry.get(name)',
    '}',
    '',
  ]

  return lines.join('\n')
}
