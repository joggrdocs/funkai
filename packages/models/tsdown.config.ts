import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { defineConfig } from "tsdown";

const entriesPath = join(import.meta.dirname, ".generated", "entries.json");
const generatedEntries: string[] = existsSync(entriesPath)
  ? JSON.parse(readFileSync(entriesPath, "utf-8"))
  : [];

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
