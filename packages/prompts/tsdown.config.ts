import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/runtime.ts", "src/cli.ts"],
  outDir: "dist/lib",
  format: ["esm"],
  dts: true,
  clean: true,
  unbundle: false,
  platform: "node",
  target: "node22",
});
