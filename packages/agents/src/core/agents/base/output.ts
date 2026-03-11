import { Output } from "ai";
import { match } from "ts-pattern";
import type { ZodType } from "zod";

import { isZodArray } from "@/utils/zod.js";

/**
 * Base constraint for AI SDK output strategies.
 *
 * Reaches through the `Output` namespace to the underlying
 * `Output<OUTPUT, PARTIAL, ELEMENT>` interface. Use this as the
 * type for any field that accepts `Output.text()`, `Output.object()`, etc.
 */
export type OutputSpec = Output.Output<unknown, unknown>;

/**
 * Accepted values for the `output` config field.
 *
 * Allows either:
 * - An AI SDK `Output` strategy (`Output.text()`, `Output.object()`, etc.)
 * - A raw Zod schema — automatically wrapped in `Output.object()` or
 *   `Output.array()` depending on the schema type.
 */
export type OutputParam = OutputSpec | ZodType;

/**
 * Resolve an `OutputParam` into an `OutputSpec`.
 *
 * If the value is already an `OutputSpec`, it is returned as-is.
 * If it is a raw Zod schema:
 * - `z.array(...)` → `Output.array({ element: innerSchema })`
 * - Anything else → `Output.object({ schema })`
 *
 * @internal
 */
export function resolveOutput(output: OutputParam): OutputSpec {
  // OutputSpec instances have `parseCompleteOutput` — Zod schemas don't
  return match("parseCompleteOutput" in output)
    .with(true, () => output as OutputSpec)
    .otherwise(() => {
      const schema = output as ZodType;
      return match(isZodArray(schema))
        .with(true, () => {
          const def = (schema as unknown as Record<string, unknown>)._zod as
            | { def: { element?: ZodType } }
            | undefined;
          if (def != null && def.def.element != null) {
            return Output.array({ element: def.def.element });
          }
          throw new Error(
            "Failed to extract element schema from Zod array. " +
              "Pass Output.array({ element: elementSchema }) explicitly.",
          );
        })
        .otherwise(() => Output.object({ schema }));
    });
}
