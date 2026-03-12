import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path to the SDK's built-in partials directory. */
export const PARTIALS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../prompts')
