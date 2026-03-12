import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import pc from 'picocolors'
import { match } from 'ts-pattern'

import { clean } from '@/clean.js'
import { generatePromptModule, generateRegistry, type ParsedPrompt } from '@/cli/lib/codegen.js'
import { extractVariables } from '@/cli/lib/extract-variables.js'
import { flattenPartials } from '@/cli/lib/flatten.js'
import { parseFrontmatter } from '@/cli/lib/frontmatter.js'
import { hasLintErrors, lintPrompt, type LintResult } from '@/cli/lib/lint.js'
import { discoverPrompts } from '@/cli/lib/paths.js'

const SDK_PARTIALS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/prompts')

export interface GenerateOptions {
  out: string
  roots: string[]
  partials?: string
  silent: boolean
}

/**
 * Run the `generate` command.
 *
 * Discovers `.prompt` files, parses frontmatter schemas, lints
 * template variables, and generates typed TypeScript modules.
 */
export function runGenerate(options: GenerateOptions): void {
  const { out, roots, partials, silent } = options

  const discovered = discoverPrompts(roots)

  if (!silent) {
    console.log(`Found ${discovered.length} prompt(s)`)
  }

  const customPartialsDir = resolve(partials ?? resolve(out, '../partials'))
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: checking custom partials directory from CLI config
  const partialsDirs = match(existsSync(customPartialsDir))
    .with(true, () => [customPartialsDir, SDK_PARTIALS_DIR])
    .otherwise(() => [SDK_PARTIALS_DIR])

  const prompts: ParsedPrompt[] = []
  const lintResults: LintResult[] = []

  for (const d of discovered) {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
    const raw = readFileSync(d.filePath, 'utf-8')
    const frontmatter = parseFrontmatter(raw, d.filePath)
    const template = flattenPartials(clean(raw), partialsDirs)
    const templateVars = extractVariables(template)

    const result = lintPrompt(frontmatter.name, d.filePath, frontmatter.schema, templateVars)
    lintResults.push(result)

    if (!silent) {
      const varCount = frontmatter.schema.length
      const varList = match(varCount > 0)
        .with(true, () => ` (${frontmatter.schema.map((v) => v.name).join(', ')})`)
        .otherwise(() => '')
      console.log(`  ${frontmatter.name}${varList}`)
    }

    prompts.push({
      name: frontmatter.name,
      group: frontmatter.group,
      schema: frontmatter.schema,
      template,
      sourcePath: d.filePath,
    })
  }

  for (const result of lintResults) {
    for (const diag of result.diagnostics) {
      if (diag.level === 'error') {
        console.error(`${pc.red('ERROR')} ${diag.message}`)
      } else {
        console.warn(`${pc.yellow('WARN')} ${diag.message}`)
      }
    }
  }

  if (hasLintErrors(lintResults)) {
    console.error(`\n${pc.red('Lint errors found. Fix them before generating.')}`)
    process.exit(1)
  }

  const outDir = resolve(out)
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: output directory from CLI config
  mkdirSync(outDir, { recursive: true })

  for (const prompt of prompts) {
    const content = generatePromptModule(prompt)
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated module to output directory
    writeFileSync(resolve(outDir, `${prompt.name}.ts`), content, 'utf-8')
  }

  const registryContent = generateRegistry(prompts)
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: writing generated registry to output directory
  writeFileSync(resolve(outDir, 'index.ts'), registryContent, 'utf-8')

  if (!silent) {
    console.log(`\nGenerated ${prompts.length} prompt module(s) + registry → ${outDir}`)
  }
}
