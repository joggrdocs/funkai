import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    typecheck: {
      include: ["src/**/*.test-d.{ts,tsx}"],
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test-d.ts",
        "src/**/index.ts",
        "src/lib/mocks/**",
        "src/models/**",
        "src/core/types.ts",
        "src/core/agents/base/types.ts",
        "src/core/agents/flow/types.ts",
        "src/core/agents/flow/steps/agent.ts",
        "src/core/agents/flow/steps/all.ts",
        "src/core/agents/flow/steps/builder.ts",
        "src/core/agents/flow/steps/each.ts",
        "src/core/agents/flow/steps/map.ts",
        "src/core/agents/flow/steps/race.ts",
        "src/core/agents/flow/steps/reduce.ts",
        "src/core/agents/flow/steps/result.ts",
        "src/core/agents/flow/steps/step.ts",
        "src/core/agents/flow/steps/while.ts",
        "src/core/provider/types.ts",
        "src/lib/context.ts",
        "src/testing/**",
      ],
      reporter: ["text", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
