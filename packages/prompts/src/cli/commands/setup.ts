import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import * as p from '@clack/prompts'
import { match } from 'ts-pattern'

const VSCODE_DIR = '.vscode'
const SETTINGS_FILE = 'settings.json'
const EXTENSIONS_FILE = 'extensions.json'
const GITIGNORE_FILE = '.gitignore'
const TSCONFIG_FILE = 'tsconfig.json'
const GITIGNORE_ENTRY = '.prompts/client/'
const PROMPTS_ALIAS = '~prompts'
const PROMPTS_ALIAS_PATH = './.prompts/client/index.ts'

/**
 * Run the `setup` command.
 *
 * Interactively configures the project for `.prompt` file usage:
 * - VSCode settings (file association + Liquid syntax)
 * - VSCode extension recommendation
 * - `.gitignore` entry for generated `.prompts/client/` directory
 * - `tsconfig.json` `~prompts` path alias
 */
export async function runSetup(): Promise<void> {
  p.intro('Prompt SDK — Project Setup')

  const shouldConfigure = await p.confirm({
    message: 'Configure VSCode to treat .prompt files as Markdown with Liquid syntax?',
    initialValue: true,
  })

  if (p.isCancel(shouldConfigure)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  if (shouldConfigure) {
    const vscodeDir = resolve(VSCODE_DIR)
    mkdirSync(vscodeDir, { recursive: true })

    const settingsPath = resolve(vscodeDir, SETTINGS_FILE)
    const settings = readJsonFile(settingsPath)

    const associations = (settings['files.associations'] ?? {}) as Record<string, string>
    associations['*.prompt'] = 'markdown'
    settings['files.associations'] = associations
    settings['liquid.engine'] = 'standard'

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8')
    p.log.success(`Updated ${settingsPath}`)
  }

  const shouldRecommend = await p.confirm({
    message: 'Add Shopify Liquid extension to VSCode recommendations?',
    initialValue: true,
  })

  if (p.isCancel(shouldRecommend)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  if (shouldRecommend) {
    const vscodeDir = resolve(VSCODE_DIR)
    mkdirSync(vscodeDir, { recursive: true })

    const extensionsPath = resolve(vscodeDir, EXTENSIONS_FILE)
    const extensions = readJsonFile(extensionsPath)

    const recommendations = (extensions.recommendations ?? []) as string[]
    const extensionId = 'sissel.shopify-liquid'

    if (!recommendations.includes(extensionId)) {
      recommendations.push(extensionId)
      extensions.recommendations = recommendations
    }

    writeFileSync(extensionsPath, JSON.stringify(extensions, null, 2) + '\n', 'utf-8')
    p.log.success(`Updated ${extensionsPath}`)
  }

  const shouldGitignore = await p.confirm({
    message: 'Add .prompts/client/ to .gitignore? (generated client should not be committed)',
    initialValue: true,
  })

  if (p.isCancel(shouldGitignore)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  if (shouldGitignore) {
    const gitignorePath = resolve(GITIGNORE_FILE)
    const existing = match(existsSync(gitignorePath))
      .with(true, () => readFileSync(gitignorePath, 'utf-8'))
      .otherwise(() => '')

    if (!existing.includes(GITIGNORE_ENTRY)) {
      const separator = match(existing.length > 0 && !existing.endsWith('\n'))
        .with(true, () => '\n')
        .otherwise(() => '')
      const block = `${separator}\n# Generated prompt client (created by \`pnpm prompts:generate\`)\n${GITIGNORE_ENTRY}\n`
      writeFileSync(gitignorePath, existing + block, 'utf-8')
      p.log.success(`Added ${GITIGNORE_ENTRY} to ${gitignorePath}`)
    } else {
      p.log.info(`${GITIGNORE_ENTRY} already in ${gitignorePath}`)
    }
  }

  const shouldTsconfig = await p.confirm({
    message: 'Add ~prompts path alias to tsconfig.json?',
    initialValue: true,
  })

  if (p.isCancel(shouldTsconfig)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  if (shouldTsconfig) {
    const tsconfigPath = resolve(TSCONFIG_FILE)
    const tsconfig = readJsonFile(tsconfigPath)

    const compilerOptions = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>
    const paths = (compilerOptions.paths ?? {}) as Record<string, string[]>

    // oxlint-disable-next-line security/detect-object-injection -- safe: PROMPTS_ALIAS is a known constant string
    if (!paths[PROMPTS_ALIAS]) {
      // oxlint-disable-next-line security/detect-object-injection -- safe: PROMPTS_ALIAS is a known constant string
      paths[PROMPTS_ALIAS] = [PROMPTS_ALIAS_PATH]
      compilerOptions.paths = paths
      tsconfig.compilerOptions = compilerOptions

      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf-8')
      p.log.success(`Added ${PROMPTS_ALIAS} alias to ${tsconfigPath}`)
    } else {
      p.log.info(`${PROMPTS_ALIAS} alias already in ${tsconfigPath}`)
    }
  }

  p.outro('Project setup complete.')
}

/**
 * Read a JSON file, returning an empty object if it doesn't exist
 * or contains invalid JSON.
 */
function readJsonFile(filePath: string): Record<string, unknown> {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: tsconfig path from CLI discovery
  if (!existsSync(filePath)) {
    return {}
  }

  try {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reading tsconfig file
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}
