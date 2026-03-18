import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { defineConfig } from "tsdown";

const entriesPath = join(import.meta.dirname, ".generated", "entries.json");
// oxlint-disable-next-line eslint-plugin-jest/require-hook
let generatedEntries: string[] = [];
if (existsSync(entriesPath)) {
  generatedEntries = JSON.parse(readFileSync(entriesPath, "utf8"));
}

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
