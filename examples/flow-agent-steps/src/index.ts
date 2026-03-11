import { flowAgent } from "@funkai/agents";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Demonstrates the various `$` step types available in flow agents:
//   $.step    — generic tracked operation
//   $.map     — parallel map with optional concurrency
//   $.each    — sequential side effects
//   $.reduce  — sequential accumulation
//   $.while   — conditional loop
//   $.all     — concurrent heterogeneous operations (Promise.all)
//   $.race    — first-to-finish wins (Promise.race)
// ---------------------------------------------------------------------------

const stepsDemo = flowAgent(
  {
    name: "steps-demo",
    input: z.object({ numbers: z.array(z.number()) }),
    output: z.object({
      doubled: z.array(z.number()),
      sum: z.number(),
      logged: z.boolean(),
      countdown: z.number(),
      parallel: z.array(z.unknown()),
      fastest: z.unknown(),
    }),
  },
  async ({ input, $, log }) => {
    // -----------------------------------------------------------------------
    // $.step — a single tracked unit of work
    // -----------------------------------------------------------------------
    const stepResult = await $.step({
      id: "validate-input",
      execute: async () => {
        log.info("Validating input...");
        if (input.numbers.length === 0) {
          throw new Error("At least one number is required");
        }
        return { valid: true, count: input.numbers.length };
      },
    });

    if (!stepResult.ok) {
      throw new Error(`Validation failed: ${stepResult.error.message}`);
    }

    log.info({ count: stepResult.value.count }, "Input validated");

    // -----------------------------------------------------------------------
    // $.map — parallel map over items
    // -----------------------------------------------------------------------
    const mapResult = await $.map({
      id: "double-numbers",
      input: input.numbers,
      concurrency: 3,
      execute: async ({ item }) => {
        // Simulate async work
        await new Promise((r) => setTimeout(r, 10));
        return item * 2;
      },
    });

    if (!mapResult.ok) {
      throw new Error(`Map failed: ${mapResult.error.message}`);
    }

    const doubled = mapResult.value;

    // -----------------------------------------------------------------------
    // $.each — sequential side effects (returns void)
    // -----------------------------------------------------------------------
    const eachResult = await $.each({
      id: "log-numbers",
      input: doubled,
      execute: async ({ item, index }) => {
        log.info({ index, value: item }, "Processing number");
      },
    });

    // -----------------------------------------------------------------------
    // $.reduce — sequential accumulation
    // -----------------------------------------------------------------------
    const reduceResult = await $.reduce({
      id: "sum-numbers",
      input: doubled,
      initial: 0,
      execute: async ({ item, accumulator }) => {
        return accumulator + item;
      },
    });

    if (!reduceResult.ok) {
      throw new Error(`Reduce failed: ${reduceResult.error.message}`);
    }

    // -----------------------------------------------------------------------
    // $.while — conditional loop
    // -----------------------------------------------------------------------
    const whileResult = await $.while({
      id: "countdown",
      condition: ({ value, index }: { value: number | undefined; index: number }) => {
        const current = value ?? 5;
        return current > 0 && index < 10;
      },
      execute: async ({ index }) => {
        const value = 5 - index - 1;
        log.info({ iteration: index, value }, "Countdown");
        return value;
      },
    });

    // -----------------------------------------------------------------------
    // $.all — run heterogeneous operations concurrently
    // -----------------------------------------------------------------------
    const allResult = await $.all({
      id: "parallel-tasks",
      entries: [
        async () => {
          await new Promise((r) => setTimeout(r, 50));
          return "task-a-done";
        },
        async () => {
          await new Promise((r) => setTimeout(r, 30));
          return "task-b-done";
        },
      ],
    });

    if (!allResult.ok) {
      throw new Error(`All failed: ${allResult.error.message}`);
    }

    // -----------------------------------------------------------------------
    // $.race — first to finish wins
    // -----------------------------------------------------------------------
    const raceResult = await $.race({
      id: "race-tasks",
      entries: [
        async () => {
          await new Promise((r) => setTimeout(r, 100));
          return "slow";
        },
        async () => {
          await new Promise((r) => setTimeout(r, 10));
          return "fast";
        },
      ],
    });

    if (!raceResult.ok) {
      throw new Error(`Race failed: ${raceResult.error.message}`);
    }

    return {
      doubled,
      sum: reduceResult.value,
      logged: eachResult.ok,
      countdown: whileResult.ok ? (whileResult.value ?? 0) : 0,
      parallel: allResult.value,
      fastest: raceResult.value,
    };
  },
);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const result = await stepsDemo.generate({ numbers: [1, 2, 3, 4, 5] });

if (result.ok) {
  console.log("Result:", JSON.stringify(result.output, null, 2));
  console.log("Duration:", result.duration, "ms");
  console.log("Trace:", JSON.stringify(result.trace, null, 2));
} else {
  console.error("Error:", result.error);
}
