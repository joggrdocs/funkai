import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import pc from 'picocolors'
import { match, P } from 'ts-pattern'

export interface CreateOptions {
  name: string
  out?: string
  partial?: boolean
}

const TEMPLATE = (name: string) => `---
name: ${name}
---

`

/**
 * Run the `create` command.
 *
 * Scaffolds a new `.prompt` file with pre-filled frontmatter.
 */
export function runCreate(options: CreateOptions): void {
  const { name, out, partial } = options
  const dir = match({ partial, out })
    .with({ partial: true }, () => resolve('.prompts/partials'))
    .with({ out: P.string }, ({ out: outDir }) => resolve(outDir))
    .otherwise(() => process.cwd())
  const filePath = resolve(dir, `${name}.prompt`)

  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: user-provided CLI argument for prompt file creation
  if (existsSync(filePath)) {
    console.error(`${pc.red('ERROR')} File already exists: ${filePath}`)
    process.exit(1)
  }

  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: directory derived from user CLI path argument
  mkdirSync(dir, { recursive: true })
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: file path derived from user CLI path argument
  writeFileSync(filePath, TEMPLATE(name), 'utf-8')

  console.log(`${pc.green('Created')} ${filePath}`)
}
