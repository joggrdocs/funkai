import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist/lib',
  format: ['esm'],
  dts: true,
  clean: true,
  unbundle: false,
  platform: 'node',
  target: 'node22',
})
