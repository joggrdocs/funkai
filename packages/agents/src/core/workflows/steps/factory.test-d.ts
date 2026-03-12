import { describe, expectTypeOf, it } from 'vitest'

import type { StepBuilder } from '@/core/workflows/steps/builder.js'
import { createStepBuilder } from '@/core/workflows/steps/factory.js'
import type { StepResult, StepError } from '@/core/workflows/steps/result.js'
import type { ResultError } from '@/utils/result.js'

describe('StepError extends ResultError', () => {
  it('is assignable to ResultError', () => {
    expectTypeOf<StepError>().toExtend<ResultError>()
  })

  it('has stepId field', () => {
    expectTypeOf<StepError['stepId']>().toBeString()
  })
})

describe('StepResult<T>', () => {
  it('success branch has ok: true', () => {
    type Success = Extract<StepResult<{ value: number }>, { ok: true }>
    expectTypeOf<Success['ok']>().toEqualTypeOf<true>()
  })

  it('success branch has value: T field', () => {
    type Success = Extract<StepResult<{ value: number }>, { ok: true }>
    expectTypeOf<Success['value']>().toEqualTypeOf<{ value: number }>()
  })

  it('success branch has step and duration', () => {
    type Success = Extract<StepResult<{ value: number }>, { ok: true }>
    expectTypeOf<Success['step']>().toHaveProperty('id')
    expectTypeOf<Success['duration']>().toBeNumber()
  })

  it('failure branch has ok: false', () => {
    type Failure = Extract<StepResult<{ value: number }>, { ok: false }>
    expectTypeOf<Failure['ok']>().toEqualTypeOf<false>()
  })

  it('failure branch has StepError', () => {
    type Failure = Extract<StepResult<{ value: number }>, { ok: false }>
    expectTypeOf<Failure['error']>().toExtend<StepError>()
  })
})

describe('createStepBuilder', () => {
  it('returns StepBuilder', () => {
    expectTypeOf(createStepBuilder).returns.toExtend<StepBuilder>()
  })
})
