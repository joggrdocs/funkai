import { Output } from "ai";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import type { OutputParam, OutputSpec } from "@/core/agents/base/output.js";
import { resolveOutput } from "@/core/agents/base/output.js";
import type { AgentConfig, GenerateParams, ToolName } from "@/core/agents/base/types.js";

describe("outputParam accepts all Output factories", () => {
  it("accepts Output.text()", () => {
    expectTypeOf(Output.text()).toExtend<OutputParam>();
  });

  it("accepts Output.object()", () => {
    expectTypeOf(Output.object({ schema: z.object({ name: z.string() }) })).toExtend<OutputParam>();
  });

  it("accepts Output.array()", () => {
    expectTypeOf(Output.array({ element: z.object({ name: z.string() }) })).toExtend<OutputParam>();
  });

  it("accepts Output.choice()", () => {
    expectTypeOf(
      Output.choice({ options: ["positive", "negative", "neutral"] as const }),
    ).toExtend<OutputParam>();
  });

  it("accepts Output.json()", () => {
    expectTypeOf(Output.json()).toExtend<OutputParam>();
  });
});

describe("outputParam accepts raw Zod schemas", () => {
  it("accepts z.object()", () => {
    expectTypeOf(z.object({ name: z.string() })).toExtend<OutputParam>();
  });

  it("accepts z.array()", () => {
    expectTypeOf(z.array(z.object({ name: z.string() }))).toExtend<OutputParam>();
  });

  it("accepts z.string()", () => {
    expectTypeOf(z.string()).toExtend<OutputParam>();
  });
});

describe("outputParam is assignable to config fields", () => {
  it("is assignable to AgentConfig.output", () => {
    expectTypeOf<OutputParam>().toExtend<
      AgentConfig<string, string, Record<string, never>, Record<string, never>>["output"]
    >();
  });

  it("is assignable to GenerateParams.output", () => {
    expectTypeOf<OutputParam>().toExtend<GenerateParams["output"]>();
  });
});

describe("toolName accepts valid tool names", () => {
  it("accepts camelCase", () => {
    expectTypeOf<ToolName<"myAgent">>().toEqualTypeOf<"myAgent">();
  });

  it("accepts snake_case", () => {
    expectTypeOf<ToolName<"my_agent">>().toEqualTypeOf<"my_agent">();
  });

  it("accepts single lowercase word", () => {
    expectTypeOf<ToolName<"agent">>().toEqualTypeOf<"agent">();
  });

  it("accepts all-uppercase acronyms", () => {
    expectTypeOf<ToolName<"API">>().toEqualTypeOf<"API">();
  });

  it("accepts uppercase with underscores", () => {
    expectTypeOf<ToolName<"HTTP_CLIENT">>().toEqualTypeOf<"HTTP_CLIENT">();
  });
});

describe("toolName rejects invalid tool names", () => {
  it("rejects empty string", () => {
    expectTypeOf<ToolName<"">>().toBeNever();
  });

  it("rejects kebab-case", () => {
    expectTypeOf<ToolName<"my-agent">>().toBeNever();
  });

  it("rejects spaces", () => {
    expectTypeOf<ToolName<"my agent">>().toBeNever();
  });
});

describe("toolName works in AgentConfig.agents", () => {
  it("accepts valid agent keys", () => {
    expectTypeOf<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      myAgent: ToolName<"myAgent"> extends never ? never : any;
    }>().not.toBeNever();
  });

  it("rejects invalid agent keys via ToolName", () => {
    expectTypeOf<ToolName<"my-agent">>().toBeNever();
  });
});

describe("resolveOutput return type", () => {
  it("returns OutputSpec", () => {
    expectTypeOf(resolveOutput).returns.toExtend<OutputSpec>();
  });

  it("accepts OutputSpec input", () => {
    expectTypeOf(resolveOutput).toBeCallableWith(Output.text());
  });

  it("accepts ZodType input", () => {
    expectTypeOf(resolveOutput).toBeCallableWith(z.object({ x: z.number() }));
  });
});
