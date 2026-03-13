# Troubleshooting

## OPENROUTER_API_KEY not set

**Fix:** Set the `OPENROUTER_API_KEY` environment variable in your `.env` file or shell environment.

## Agent has `input` schema but no `prompt` function

**Fix:** Both `input` and `prompt` are required together. Provide both or omit both for simple mode.

## Agent has `prompt` function but no `input` schema

**Fix:** Both `input` and `prompt` are required together. Provide both or omit both for simple mode.

## Input validation failed

**Fix:** Check that all required fields are present and types match the Zod schema.

## Unknown model

**Fix:** Use `tryModel()` for safe lookup, or add the model to `models.config.json` and run `pnpm --filter=@funkai/agents generate:models`.

## StepResult access

**Fix:** Use `.value` on success, not direct property access. Always check `.ok` first.

## StreamResult output and messages are promises

**Fix:** `StreamResult.output` and `StreamResult.messages` are promises -- `await` them after the stream completes.

## `$.all` and `$.race` entries must be factory functions

**Fix:** Use `(signal) => fetchA(signal)`, not pre-started promises like `fetchA()`.

## Hook errors being swallowed

By design. Hook errors are caught and never propagate. Handle errors inside the hook itself if you need them to surface.

## Abort signal propagation

Signals propagate through the entire execution tree: agents, workflows, subagents, and `$.all`/`$.race` entries.

## Tool not being called by agent

**Fix:** Improve the tool's `description` and add `.describe()` annotations to `inputSchema` fields.

## Result type pattern matching

**Fix:** Always check `.ok` before accessing success fields. Use `result.error.code` on failure.

## Workflow output validation failed

**Fix:** Ensure the handler returns an object matching the `output` Zod schema exactly.

## References

- [Agent](core/agent.md)
- [Workflow](core/workflow.md)
- [Provider Overview](provider/overview.md)
- [Create an Agent](guides/create-agent.md)
