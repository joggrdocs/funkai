import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { defineConfig } from "tsdown";

const entriesPath = join(import.meta.dirname, ".generated", "entries.json");
// oxlint-disable-next-line eslint-plugin-jest/require-hook
const generatedEntries: string[] = (() => {
  if (existsSync(entriesPath)) {
    return JSON.parse(readFileSync(entriesPath, "utf8")) as string[];
  }
  return [];
})();

export default defineConfig([
  {
    entry: ["src/index.ts", ...generatedEntries],
    outDir: "dist",
    format: ["esm"],
    dts: true,
    clean: true,
    unbundle: false,
    platform: "node",
    target: "node22",
  },
]);
