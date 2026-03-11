import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist/lib',
    format: ['esm'],
    dts: true,
    clean: true,
    unbundle: false,
    platform: 'node',
    target: 'node22',
  },
  {
    entry: { cli: 'src/cli/index.ts' },
    outDir: 'dist/cli',
    format: ['esm'],
    dts: false,
    clean: true,
    unbundle: true,
    inlineOnly: false,
    platform: 'node',
    target: 'node22',
    banner: { js: '#!/usr/bin/env node' },
  },
])
