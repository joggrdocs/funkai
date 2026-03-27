import type { StepResult, ToolSet } from "ai";
import { assertType, describe, expectTypeOf, it } from "vitest";

import type { AIStepResult, StepFinishEvent } from "@/core/types.js";
import { createAgentStepFinishEvent, createFlowStepFinishEvent } from "@/core/types.js";

describe("StepFinishEvent", () => {
  it("has required toolCalls matching AIStepResult", () => {
    expectTypeOf<StepFinishEvent["toolCalls"]>().toEqualTypeOf<AIStepResult["toolCalls"]>();
  });

  it("has required toolResults matching AIStepResult", () => {
    expectTypeOf<StepFinishEvent["toolResults"]>().toEqualTypeOf<AIStepResult["toolResults"]>();
  });

  it("toolCalls matches AI SDK StepResult toolCalls", () => {
    expectTypeOf<StepFinishEvent["toolCalls"]>().toEqualTypeOf<StepResult<ToolSet>["toolCalls"]>();
  });

  it("toolResults matches AI SDK StepResult toolResults", () => {
    expectTypeOf<StepFinishEvent["toolResults"]>().toEqualTypeOf<
      StepResult<ToolSet>["toolResults"]
    >();
  });

  it("has required stepId and stepOperation", () => {
    expectTypeOf<StepFinishEvent["stepId"]>().toBeString();
    expectTypeOf<StepFinishEvent["stepOperation"]>().toBeString();
  });

  it("extends AIStepResult", () => {
    expectTypeOf<StepFinishEvent>().toMatchTypeOf<AIStepResult>();
  });
});

describe("createAgentStepFinishEvent", () => {
  it("returns StepFinishEvent", () => {
    expectTypeOf(createAgentStepFinishEvent).returns.toExtend<StepFinishEvent>();
  });

  it("result has non-optional toolCalls", () => {
    const event = {} as ReturnType<typeof createAgentStepFinishEvent>;
    assertType<AIStepResult["toolCalls"]>(event.toolCalls);
  });
});

describe("createFlowStepFinishEvent", () => {
  it("returns StepFinishEvent", () => {
    expectTypeOf(createFlowStepFinishEvent).returns.toExtend<StepFinishEvent>();
  });

  it("result has non-optional toolCalls", () => {
    const event = {} as ReturnType<typeof createFlowStepFinishEvent>;
    assertType<AIStepResult["toolCalls"]>(event.toolCalls);
  });
});
