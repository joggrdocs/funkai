import { createFlowEngine } from "@funkai/agents";
import type { ExecutionContext } from "@funkai/agents";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Flow engines let you define reusable custom step types that appear on `$`.
// This is useful for building domain-specific orchestration frameworks.
// ---------------------------------------------------------------------------

// 1. Define custom step factories
//
//    Each factory receives `ctx` (signal + logger) and `config` (user args).
//    The return value becomes the step result.

const engine = createFlowEngine({
  // Custom steps available on `$`
  $: {
    /**
     * Fetch data from a URL with automatic retry.
     */
    fetch: async ({
      ctx,
      config,
    }: {
      ctx: ExecutionContext;
      config: { url: string; retries?: number };
    }) => {
      const maxRetries = config.retries ?? 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (ctx.signal.aborted) {
          throw new Error("Aborted");
        }

        try {
          ctx.log.info({ url: config.url, attempt }, "Fetching...");
          // Simulated fetch
          return { status: 200, data: `Response from ${config.url}` };
        } catch (err) {
          if (attempt === maxRetries - 1) throw err;
          ctx.log.warn({ attempt }, "Retrying...");
        }
      }

      throw new Error("Exhausted retries");
    },

    /**
     * Transform data with a named transform function.
     */
    transform: async ({
      config,
    }: {
      config: { data: unknown; format: "json" | "csv" | "text" };
    }) => {
      switch (config.format) {
        case "json":
          return JSON.stringify(config.data);
        case "csv":
          return `data,${String(config.data)}`;
        case "text":
          return String(config.data);
      }
    },
  },

  // Engine-level hooks fire before flow-level hooks
  onStart: () => {
    console.log("[engine] Flow started");
  },
  onFinish: () => {
    console.log("[engine] Flow finished");
  },
  onStepStart: ({ step }) => {
    console.log(`[engine] Step started: ${step.id}`);
  },
  onStepFinish: ({ step, duration }) => {
    console.log(`[engine] Step finished: ${step.id} (${duration}ms)`);
  },
});

// ---------------------------------------------------------------------------
// 2. Create flow agents using the engine
//
//    The engine returns a factory function. Custom steps are available
//    on `$` alongside the built-in ones ($.step, $.map, etc.)
// ---------------------------------------------------------------------------

const pipeline = engine(
  {
    name: "data-pipeline",
    input: z.object({ urls: z.array(z.string()) }),
    output: z.object({ results: z.array(z.string()) }),
    onStart: () => {
      console.log("[flow] Pipeline started");
    },
  },
  async ({ input, $ }) => {
    // Use built-in $.map with custom $.fetch inside
    const fetchResult = await $.map({
      id: "fetch-all",
      input: input.urls,
      concurrency: 2,
      execute: async ({ item }) => {
        // Custom step: $.fetch
        const response = await $.fetch({ url: item });
        return response.data;
      },
    });

    if (!fetchResult.ok) {
      throw new Error(`Fetch failed: ${fetchResult.error.message}`);
    }

    // Use custom step: $.transform
    const transformResult = await $.map({
      id: "transform-all",
      input: fetchResult.value,
      execute: async ({ item }) => {
        const formatted = await $.transform({ data: item, format: "text" });
        return formatted;
      },
    });

    if (!transformResult.ok) {
      throw new Error(`Transform failed: ${transformResult.error.message}`);
    }

    return { results: transformResult.value };
  },
);

// ---------------------------------------------------------------------------
// 3. Run
// ---------------------------------------------------------------------------

const result = await pipeline.generate({
  urls: ["https://api.example.com/data/1", "https://api.example.com/data/2"],
});

if (result.ok) {
  console.log("\nResults:", result.output.results);
  console.log("Duration:", result.duration, "ms");
} else {
  console.error("Error:", result.error);
}
