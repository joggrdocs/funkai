# Research: Sub-Agent Model (Claude Code-style)

> **Date**: 2026-03-06
> **AI SDK Version**: `^6.0.111`
> **Status**: Core primitives exist; gaps identified for full sub-agent orchestration

## Summary

Our agent SDK already supports basic sub-agent delegation — agents can be passed as `agents` in config and are auto-wrapped as tools. However, several capabilities needed for a full Claude Code-style sub-agent model are missing: context forwarding, dynamic spawning, shared memory, and result-to-context feedback.

## What Exists Today

### Agent-as-Tool Delegation (`utils.ts:39-96`)

Sub-agents are declared in `AgentConfig.agents` and auto-wrapped into AI SDK tools by `buildAITools()`:

```typescript
const parent = agent({
  name: "orchestrator",
  model: "anthropic/claude-sonnet-4",
  tools: { search, readFile },
  agents: { researcher, coder }, // auto-wrapped as callable tools
});
```

Under the hood, each sub-agent becomes a tool:

```typescript
// For typed sub-agents (with input schema):
tool({
  description: `Delegate to ${toolName}`,
  inputSchema: meta.inputSchema,
  execute: async (input, { abortSignal }) => {
    const r = await runnable.generate(input, { signal: abortSignal });
    if (!r.ok) throw new Error(r.error.message);
    return r.output;
  },
});

// For untyped sub-agents (simple mode):
tool({
  description: `Delegate to ${toolName}`,
  inputSchema: z.object({ prompt: z.string() }),
  execute: async ({ prompt }, { abortSignal }) => {
    const r = await runnable.generate(prompt, { signal: abortSignal });
    if (!r.ok) throw new Error(r.error.message);
    return r.output;
  },
});
```

### Signal Propagation

`abortSignal` flows from parent to child automatically. If the parent is cancelled, child agents abort.

### RUNNABLE_META

Agents carry metadata via a symbol key (`RUNNABLE_META`) containing `name` and `inputSchema`. This allows `buildAITools` to create properly described tools without reflection.

### Workflow-Level Orchestration (`StepBuilder.$`)

The `$.agent()` step provides tracked sub-agent invocation within workflows:

```typescript
const result = await $.agent({
  id: "analyze",
  agent: analyzerAgent,
  input: { filePath: "..." },
  config: { tools: extraTools },
});
```

This records the agent call in the execution trace with input/output/usage.

## Gaps for Claude Code-style Sub-Agents

### Gap 1: No Context Forwarding to Sub-Agents

**Problem**: Sub-agents start fresh. They receive only the `input` argument — not the parent's conversation history, accumulated knowledge, or `experimental_context`.

**Claude Code behavior**: Sub-agents can be spawned with "access to current context" — they see the full conversation history before the tool call.

**Fix**: Modify `buildAITools` to optionally forward `experimental_context` to child agent calls. This requires:

1. Wiring `experimental_context` through (see [context research](./experimental-context.md))
2. The sub-agent tool wrapper accessing it via the AI SDK's second execute arg
3. A strategy for how to translate parent context into child agent input/system prompt

```typescript
// Conceptual — context-aware sub-agent wrapper
execute: async (input, { abortSignal, experimental_context }) => {
  const ctx = experimental_context as ParentContext;
  const r = await runnable.generate(input, {
    signal: abortSignal,
    system: buildChildSystem(ctx), // inject parent context as system prompt
    context: ctx, // or forward context directly
  });
  if (!r.ok) throw new Error(r.error.message);
  return r.output;
};
```

### Gap 2: No Result-to-Context Feedback

**Problem**: When a sub-agent finishes, its output becomes a tool result string. There is no structured way to merge the child's findings back into the parent's context beyond what the model reads from the tool result.

**Claude Code behavior**: Sub-agent results are folded back into the parent's working context. The parent can reference findings from any sub-agent.

**Fix**: Use `prepareStep` + `experimental_context` to accumulate sub-agent results:

```typescript
prepareStep: async ({ steps, experimental_context }) => {
  const ctx = experimental_context as AgentContext;
  const lastStep = steps.at(-1);
  const subAgentResults = (lastStep?.toolResults ?? [])
    .filter((tr) => isSubAgentTool(tr.toolName))
    .map((tr) => ({ agent: tr.toolName, result: tr.result }));

  return {
    experimental_context: {
      ...ctx,
      findings: [...ctx.findings, ...subAgentResults],
    },
  };
};
```

### Gap 3: No Dynamic Sub-Agent Spawning

**Problem**: Sub-agents must be declared at agent creation time via the `agents` config field. The set of available sub-agents is static.

**Claude Code behavior**: Spawns specialized agents on-demand based on task type (Explore agent, Plan agent, Bash agent, etc.).

**Fix**: Use `prepareStep` to dynamically modify the tools map:

```typescript
prepareStep: async ({ steps, experimental_context }) => {
  const ctx = experimental_context as OrchestratorContext;
  // Spawn a code reviewer sub-agent only after code has been written
  if (ctx.codeWritten && !ctx.reviewerSpawned) {
    return {
      activeTools: [...defaultTools, "code-reviewer"],
      experimental_context: { ...ctx, reviewerSpawned: true },
    };
  }
  return {};
};
```

This requires `prepareStep` support (see [prepareStep research](./prepare-step-and-active-tools.md)).

For truly dynamic agent creation (not just activation), the parent would need to construct new agent instances at runtime and inject them into the tools map. This is possible but requires a more significant extension to `buildAITools`.

### Gap 4: No Shared Memory Between Sibling Agents

**Problem**: Sub-agents are isolated. Sibling agents (agents at the same level) cannot read each other's outputs or share intermediate state.

**Claude Code behavior**: Agents share a task list, can read each other's outputs, and coordinate via messages.

**Fix options**:

1. **Via `experimental_context`**: The parent accumulates all sub-agent results in context, and when delegating to the next sub-agent, includes relevant prior results in its input/system prompt.

2. **External state store**: Provide a shared key-value store (or task list) as a tool available to all sub-agents. Each sub-agent can read/write to it.

3. **Message passing**: Add a `sendMessage` tool that sub-agents can use to post results to a shared channel the parent monitors.

Option 1 is the simplest and works with the AI SDK's existing primitives. Options 2 and 3 require custom tool implementations.

### Gap 5: No Per-Delegation Step Budget

**Problem**: When the parent delegates to a sub-agent, the child runs with its own `maxSteps` (default 20). The parent has no way to constrain how many steps a specific delegation can use.

**Claude Code behavior**: Sub-agents have configurable `max_turns` per invocation.

**Fix**: The `buildAITools` wrapper could accept a `maxSteps` override per delegation:

```typescript
// In AgentConfig or via a wrapper
agents: {
  researcher: { agent: researcherAgent, maxSteps: 10 },
  coder: { agent: coderAgent, maxSteps: 30 },
}
```

And the tool wrapper would forward it:

```typescript
execute: async (input, { abortSignal }) => {
  const r = await runnable.generate(input, {
    signal: abortSignal,
    maxSteps: delegationConfig.maxSteps,
  });
  // ...
};
```

## Architecture: Full Sub-Agent Model

```
┌──────────────────────────────────────────────────────┐
│  Orchestrator Agent                                   │
│                                                       │
│  experimental_context: {                              │
│    task: "...",                                        │
│    findings: [],                                      │
│    phase: "research",                                 │
│  }                                                    │
│                                                       │
│  prepareStep: ─► context management                   │
│               ─► active tool selection                │
│               ─► model switching                      │
│               ─► message compression                  │
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │Research │  │ Coder   │  │Reviewer │  ◄─ sub-agents│
│  │Agent    │  │ Agent   │  │Agent    │               │
│  └────┬────┘  └────┬────┘  └────┬────┘              │
│       │            │            │                     │
│       ▼            ▼            ▼                     │
│  Receives     Receives     Receives                   │
│  parent ctx   parent ctx   parent ctx                 │
│  + findings   + findings   + code                     │
│                                                       │
│  Results flow back via tool results                    │
│  prepareStep accumulates into context                 │
└──────────────────────────────────────────────────────┘
```

## Implementation Priority

| Priority | Item                                                      | Dependency |
| -------- | --------------------------------------------------------- | ---------- |
| **P0**   | Wire `prepareStep` through `AgentConfig`/`AgentOverrides` | None       |
| **P0**   | Wire `experimental_context` through                       | None       |
| **P0**   | Fix `tool()` execute to forward AI SDK options            | None       |
| **P1**   | Context-aware sub-agent wrapper in `buildAITools`         | P0         |
| **P1**   | Per-delegation `maxSteps`                                 | None       |
| **P2**   | Dynamic agent spawning via `prepareStep`                  | P0         |
| **P2**   | Shared memory/state store tool                            | P1         |

## References

- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [Agents: Loop Control Docs](https://ai-sdk.dev/docs/agents/loop-control)
- [AI SDK Tool Calling Docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [generateText API Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [GitHub Issue #10482 — experimental_context in prepareStep](https://github.com/vercel/ai/issues/10482)
- [GitHub Issue #6615 — prepareStep message modification](https://github.com/vercel/ai/issues/6615)
