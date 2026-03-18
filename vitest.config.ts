import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/*.test-d.ts",
        "packages/*/src/**/index.ts",

        // agents
        "packages/agents/src/core/types.ts",
        "packages/agents/src/core/agents/base/types.ts",
        "packages/agents/src/core/agents/flow/types.ts",
        "packages/agents/src/core/agents/flow/steps/agent.ts",
        "packages/agents/src/core/agents/flow/steps/all.ts",
        "packages/agents/src/core/agents/flow/steps/builder.ts",
        "packages/agents/src/core/agents/flow/steps/each.ts",
        "packages/agents/src/core/agents/flow/steps/map.ts",
        "packages/agents/src/core/agents/flow/steps/race.ts",
        "packages/agents/src/core/agents/flow/steps/reduce.ts",
        "packages/agents/src/core/agents/flow/steps/result.ts",
        "packages/agents/src/core/agents/flow/steps/step.ts",
        "packages/agents/src/core/agents/flow/steps/while.ts",
        "packages/agents/src/core/provider/types.ts",
        "packages/agents/src/lib/context.ts",
        "packages/agents/src/testing/**",
        "packages/agents/src/lib/mocks/**",

        // models (auto-generated)
        "packages/models/src/catalog/providers/**",
        "packages/models/src/providers/**",

        // prompts
        "packages/prompts/src/types.ts",
      ],
      reporter: ["text", "lcov"],
    },
  },
});
