import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { command } from '@kidd-cli/core'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { clean, PARTIALS_DIR } from '@funkai/prompts'
import { extractVariables } from '@/lib/extract-variables.js'
import { flattenPartials } from '@/lib/flatten.js'
import { parseFrontmatter } from '@/lib/frontmatter.js'
import { hasLintErrors, lintPrompt, type LintResult } from '@/lib/lint.js'
import { discoverPrompts } from '@/lib/paths.js'

export default command({
  description: 'Validate .prompt files for schema/template mismatches',
  args: z.object({
    roots: z.array(z.string()).describe('Root directories to scan for .prompt files'),
    partials: z.string().optional().describe('Custom partials directory'),
    silent: z.boolean().default(false).describe('Suppress output except errors'),
  }),
  handler(ctx) {
    const { roots, partials, silent } = ctx.args

    const discovered = discoverPrompts([...roots])

    if (!silent) {
      ctx.logger.info(`Linting ${discovered.length} prompt(s)...`)
    }

    const customPartialsDir = resolve(partials ?? '.prompts/partials')
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: checking custom partials directory from CLI config
    const partialsDirs = match(existsSync(customPartialsDir))
      .with(true, () => [customPartialsDir, PARTIALS_DIR])
      .otherwise(() => [PARTIALS_DIR])

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
        ctx.logger.error(diag.message)
      } else {
        ctx.logger.warn(diag.message)
      }
    }

    const errorCount = diagnostics.filter((d) => d.level === 'error').length
    const warnCount = diagnostics.filter((d) => d.level !== 'error').length

    if (!silent) {
      const summary = [
        `${discovered.length} prompt(s) linted`,
        match(errorCount > 0)
          .with(true, () => `${errorCount} error(s)`)
          .otherwise(() => undefined),
        match(warnCount > 0)
          .with(true, () => `${warnCount} warning(s)`)
          .otherwise(() => undefined),
      ]
        .filter(Boolean)
        .join(', ')

      ctx.logger.info(summary)
    }

    if (hasLintErrors(results)) {
      ctx.fail('Lint errors found.')
    }
  },
})
