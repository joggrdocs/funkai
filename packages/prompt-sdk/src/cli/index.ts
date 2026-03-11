import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { runCreate } from './commands/create.js'
import { runGenerate } from './commands/generate.js'
import { runLint } from './commands/lint.js'
import { runSetup } from './commands/setup.js'

const cli = yargs(hideBin(process.argv))
  .scriptName('prompts')
  .usage('$0 <command> [options]')
  .version()
  .alias('v', 'version')
  .command(
    ['$0'],
    'Show help',
    () => {},
    () => {
      cli.showHelp()
    }
  )
  .command(
    ['generate', 'gen'],
    'Generate TypeScript modules from .prompt files',
    (y) =>
      y
        .option('out', {
          alias: 'o',
          type: 'string',
          description: 'Output directory for generated files',
          demandOption: true,
        })
        .option('roots', {
          alias: 'r',
          type: 'array',
          string: true,
          description: 'Root directories to scan for .prompt files',
          demandOption: true,
        })
        .option('partials', {
          alias: 'p',
          type: 'string',
          description: 'Custom partials directory (default: <out>/../partials)',
        })
        .option('silent', {
          type: 'boolean',
          description: 'Suppress output except errors',
          default: false,
        }),
    (argv) => {
      runGenerate({
        out: argv.out,
        roots: argv.roots,
        partials: argv.partials,
        silent: argv.silent,
      })
    }
  )
  .command(
    'lint',
    'Validate .prompt files for schema/template mismatches',
    (y) =>
      y
        .option('roots', {
          alias: 'r',
          type: 'array',
          string: true,
          description: 'Root directories to scan for .prompt files',
          demandOption: true,
        })
        .option('partials', {
          alias: 'p',
          type: 'string',
          description: 'Custom partials directory (default: .prompts/partials)',
        })
        .option('silent', {
          type: 'boolean',
          description: 'Suppress output except errors',
          default: false,
        }),
    (argv) => {
      runLint({
        roots: argv.roots,
        partials: argv.partials,
        silent: argv.silent,
      })
    }
  )
  .command(
    'create <name>',
    'Create a new .prompt file',
    (y) =>
      y
        .positional('name', {
          type: 'string',
          description: 'Prompt name (kebab-case)',
          demandOption: true,
        })
        .option('out', {
          alias: 'o',
          type: 'string',
          description: 'Output directory (defaults to cwd)',
        })
        .option('partial', {
          type: 'boolean',
          description: 'Create as a partial in .prompts/partials/ (ignores --out)',
          default: false,
        }),
    (argv) => {
      runCreate({
        name: argv.name,
        out: argv.out,
        partial: argv.partial,
      })
    }
  )
  .command(
    'setup',
    'Configure VSCode IDE settings for .prompt files',
    () => {},
    () => {
      void runSetup()
    }
  )
  .strict()
  .help()

void cli.parseAsync()
