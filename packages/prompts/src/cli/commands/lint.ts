import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import pc from 'picocolors'
import { match } from 'ts-pattern'

import { clean } from '@/clean.js'
import { extractVariables } from '@/cli/lib/extract-variables.js'
import { flattenPartials } from '@/cli/lib/flatten.js'
import { parseFrontmatter } from '@/cli/lib/frontmatter.js'
import { hasLintErrors, lintPrompt, type LintResult } from '@/cli/lib/lint.js'
import { discoverPrompts } from '@/cli/lib/paths.js'

const SDK_PARTIALS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/prompts')

export interface LintOptions {
  roots: string[]
  partials?: string
  silent: boolean
}

/**
 * Run the `lint` command.
 *
 * Discovers `.prompt` files and validates that template variables
 * match the declared frontmatter schema.
 */
export function runLint(options: LintOptions): void {
  const { roots, partials, silent } = options

  const discovered = discoverPrompts(roots)

  if (!silent) {
    console.log(`Linting ${discovered.length} prompt(s)...`)
  }

  const customPartialsDir = resolve(partials ?? '.prompts/partials')
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: checking custom partials directory from CLI config
  const partialsDirs = match(existsSync(customPartialsDir))
    .with(true, () => [customPartialsDir, SDK_PARTIALS_DIR])
    .otherwise(() => [SDK_PARTIALS_DIR])

  const results: LintResult[] = []

  for (const d of discovered) {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading discovered prompt file
    const raw = readFileSync(d.filePath, 'utf-8')
    const frontmatter = parseFrontmatter(raw, d.filePath)
    const template = flattenPartials(clean(raw), partialsDirs)
    const templateVars = extractVariables(template)

    results.push(lintPrompt(frontmatter.name, d.filePath, frontmatter.schema, templateVars))
  }

  const diagnostics = results.flatMap((result) => result.diagnostics)

  for (const diag of diagnostics) {
    if (diag.level === 'error') {
      console.error(`${pc.red('ERROR')} ${diag.message}`)
    } else {
      console.warn(`${pc.yellow('WARN')} ${diag.message}`)
    }
  }

  const errorCount = diagnostics.filter((d) => d.level === 'error').length
  const warnCount = diagnostics.filter((d) => d.level !== 'error').length

  if (!silent) {
    const summary = [
      `${discovered.length} prompt(s) linted`,
      match(errorCount > 0)
        .with(true, () => pc.red(`${errorCount} error(s)`))
        .otherwise(() => undefined),
      match(warnCount > 0)
        .with(true, () => pc.yellow(`${warnCount} warning(s)`))
        .otherwise(() => undefined),
    ]
      .filter(Boolean)
      .join(', ')

    console.log(`\n${summary}`)
  }

  if (hasLintErrors(results)) {
    process.exit(1)
  }
}
