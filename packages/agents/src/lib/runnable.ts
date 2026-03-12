import type { ZodType } from 'zod'

/**
 * Symbol key for internal runnable metadata.
 *
 * Stored on Agent and Workflow objects to enable composition:
 * `buildAITools()` reads this to wrap a Runnable as a delegatable
 * tool in parent agents.
 *
 * @internal
 */
export const RUNNABLE_META: unique symbol = Symbol.for('agent-sdk:runnable-meta')

/**
 * Metadata stored on Agent and Workflow objects via {@link RUNNABLE_META}.
 *
 * @internal
 */
export interface RunnableMeta {
  name: string
  inputSchema?: ZodType
}
