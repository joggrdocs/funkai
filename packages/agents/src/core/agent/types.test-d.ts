import { Output } from "ai";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import type { OutputParam, OutputSpec } from "@/core/agent/output.js";
import { resolveOutput } from "@/core/agent/output.js";
import type { AgentConfig, AgentOverrides } from "@/core/agent/types.js";

describe("OutputParam accepts all Output factories", () => {
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

describe("OutputParam accepts raw Zod schemas", () => {
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

describe("OutputParam is assignable to config fields", () => {
  it("is assignable to AgentConfig.output", () => {
    expectTypeOf<OutputParam>().toExtend<AgentConfig<string, string, {}, {}>["output"]>();
  });

  it("is assignable to AgentOverrides.output", () => {
    expectTypeOf<OutputParam>().toExtend<AgentOverrides["output"]>();
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
