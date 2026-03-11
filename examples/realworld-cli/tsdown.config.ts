import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["api/index.ts", "cli/index.ts"],
  outDir: "dist",
  format: ["esm"],
  clean: true,
  platform: "node",
  target: "node22",
});
