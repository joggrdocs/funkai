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

## FlowStepResult access

**Fix:** Use `.output` on success, not direct property access. Always check `.ok` first.

## StreamResult output and messages are promises

**Fix:** `StreamResult.output` is a promise -- `await` it after the stream completes. Messages are accessed via `(await result.response).messages`.

## `$.all` and `$.race` entries must be factory functions

**Fix:** Use `(signal) => fetchA(signal)`, not pre-started promises like `fetchA()`.

## Hook errors being swallowed

By design. Hook errors are caught and never propagate. Handle errors inside the hook itself if you need them to surface.

## Abort signal propagation

Signals propagate through the entire execution tree: agents, flow agents, subagents, and `$.all`/`$.race` entries.

## Tool not being called by agent

**Fix:** Improve the tool's `description` and add `.describe()` annotations to `inputSchema` fields.

## Result type pattern matching

**Fix:** Always check `.ok` before accessing success fields. Use `result.error.code` on failure.

## Flow agent output validation failed

**Fix:** Ensure the handler returns an object matching the `output` Zod schema exactly.

## References

- [Create an Agent](create-agent.md)
- [Create a Flow Agent](create-flow-agent.md)
- [Overview](overview.md)
