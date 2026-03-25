import type { StepResult, ToolSet } from "ai";
import { assertType, describe, expectTypeOf, it } from "vitest";

import type { AIStepResult, StepFinishEvent } from "@/core/types.js";
import { stepFinishEventFromAIStep, stepFinishEventFromFlow } from "@/core/types.js";

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
});

describe("stepFinishEventFromAIStep", () => {
  it("returns StepFinishEvent", () => {
    expectTypeOf(stepFinishEventFromAIStep).returns.toExtend<StepFinishEvent>();
  });

  it("result has non-optional toolCalls", () => {
    const event = {} as ReturnType<typeof stepFinishEventFromAIStep>;
    assertType<AIStepResult["toolCalls"]>(event.toolCalls);
  });
});

describe("stepFinishEventFromFlow", () => {
  it("returns StepFinishEvent", () => {
    expectTypeOf(stepFinishEventFromFlow).returns.toExtend<StepFinishEvent>();
  });

  it("result has non-optional toolCalls", () => {
    const event = {} as ReturnType<typeof stepFinishEventFromFlow>;
    assertType<AIStepResult["toolCalls"]>(event.toolCalls);
  });
});
