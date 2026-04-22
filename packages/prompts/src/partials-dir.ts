import { resolve } from "node:path";

/** Absolute path to the SDK's built-in partials directory. */
export const PARTIALS_DIR = resolve(import.meta.dirname, "../prompts");
