import { describe, expectTypeOf, it } from "vitest";

import type { StepBuilder } from "@/core/agents/flow/steps/builder.js";
import { createStepBuilder } from "@/core/agents/flow/steps/factory.js";
import type { FlowStepResult, StepError } from "@/core/agents/flow/steps/result.js";
import type { ResultError } from "@/utils/result.js";

describe("stepError extends ResultError", () => {
  it("is assignable to ResultError", () => {
    expectTypeOf<StepError>().toExtend<ResultError>();
  });

  it("has stepId field", () => {
    expectTypeOf<StepError["stepId"]>().toBeString();
  });
});

describe("flowStepResult<T>", () => {
  it("success branch has ok: true", () => {
    type Success = Extract<FlowStepResult<{ value: number }>, { ok: true }>;
    expectTypeOf<Success["ok"]>().toEqualTypeOf<true>();
  });

  it("success branch has output: T field", () => {
    type Success = Extract<FlowStepResult<{ value: number }>, { ok: true }>;
    expectTypeOf<Success["output"]>().toEqualTypeOf<{ value: number }>();
  });

  it("success branch has stepId and duration", () => {
    type Success = Extract<FlowStepResult<{ value: number }>, { ok: true }>;
    expectTypeOf<Success["stepId"]>().toBeString();
    expectTypeOf<Success["duration"]>().toBeNumber();
  });

  it("failure branch has ok: false", () => {
    type Failure = Extract<FlowStepResult<{ value: number }>, { ok: false }>;
    expectTypeOf<Failure["ok"]>().toEqualTypeOf<false>();
  });

  it("failure branch has StepError", () => {
    type Failure = Extract<FlowStepResult<{ value: number }>, { ok: false }>;
    expectTypeOf<Failure["error"]>().toExtend<StepError>();
  });
});

// oxlint-disable-next-line jest(valid-title) -- function reference as title is idiomatic for type tests
describe(createStepBuilder, () => {
  it("returns StepBuilder", () => {
    expectTypeOf(createStepBuilder).returns.toExtend<StepBuilder>();
  });
});
