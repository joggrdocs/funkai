import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { command } from '@kidd-cli/core'
import { match, P } from 'ts-pattern'
import { z } from 'zod'

const TEMPLATE = (name: string) => `---
name: ${name}
---

`

export default command({
  description: 'Create a new .prompt file',
  args: z.object({
    name: z.string().describe('Prompt name (kebab-case)'),
    out: z.string().optional().describe('Output directory (defaults to cwd)'),
    partial: z.boolean().default(false).describe('Create as a partial in .prompts/partials/'),
  }),
  handler(ctx) {
    const { name, out, partial } = ctx.args
    const dir = match({ partial, out })
      .with({ partial: true }, () => resolve('.prompts/partials'))
      .with({ out: P.string }, ({ out: outDir }) => resolve(outDir))
      .otherwise(() => process.cwd())
    const filePath = resolve(dir, `${name}.prompt`)

    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: user-provided CLI argument for prompt file creation
    if (existsSync(filePath)) {
      ctx.fail(`File already exists: ${filePath}`)
    }

    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: directory derived from user CLI path argument
    mkdirSync(dir, { recursive: true })
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: file path derived from user CLI path argument
    writeFileSync(filePath, TEMPLATE(name), 'utf-8')

    ctx.logger.success(`Created ${filePath}`)
  },
})
