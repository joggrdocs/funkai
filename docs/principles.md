# Principles

## Functions all the way down

`agent()`, `flowAgent()`, and `tool()` are factory functions that return plain objects. There are no classes, no `new`, no `this`. The returned objects expose methods like `.generate()` and `.stream()`, but they are closures over configuration -- not class instances.

```typescript
const myAgent = agent({
  name: "helper",
  model: openai("gpt-4.1"),
  system: "You are helpful.",
});

// myAgent is a plain object: { generate, stream, fn }
const generate = myAgent.fn();
const result = await generate("Hello");
```

## Result, never throw

Every public method returns `Result<T>` -- a discriminated union. Pattern-match on `ok` instead of wrapping calls in try/catch. Success fields are flat on the object alongside `ok: true`. Failure carries a structured `error` with `code`, `message`, and optional `cause`.

```typescript
const result = await myAgent.generate({ prompt: "Hello" });

if (!result.ok) {
  // result.error.code: 'VALIDATION_ERROR' | 'AGENT_ERROR' | ...
  console.error(result.error.code, result.error.message);
  return;
}

// Success -- fields are flat
console.log(result.output);
console.log(result.usage.totalTokens);
```

## Closures are state

Flow agent state is just variables in your handler function. There is no state machine, no reducer, no context object to thread through. Your handler is an async function -- use `let`, loops, and conditionals as you normally would.

```typescript
const counter = flowAgent(
  {
    name: "retry-loop",
    input: z.object({ prompt: z.string() }),
    output: z.object({ answer: z.string() }),
  },
  async ({ input, $ }) => {
    let attempts = 0;
    let answer = "";

    while (attempts < 3 && answer.length === 0) {
      const result = await $.agent({
        id: `attempt-${attempts}`,
        agent: writer,
        input: input.prompt,
      });
      if (result.ok) {
        answer = result.output;
      }
      attempts += 1;
    }

    return { answer };
  },
);
```

## Composition over configuration

Small functions composed together, not large option bags. An agent with tools is just an agent config with a `tools` record. A flow agent that calls agents is just a handler that calls `$.agent()`. Subagents are agents passed in the `agents` config -- automatically wrapped as tools.

```typescript
const researcher = agent({ name: "researcher", model, system: "..." });
const writer = agent({ name: "writer", model, system: "..." });

// Subagents as tools -- the orchestrator delegates via LLM decisions
const orchestrator = agent({
  name: "orchestrator",
  model,
  system: "Coordinate research and writing.",
  agents: { researcher, writer },
});
```

## Zero hidden state

There are no singletons, no module-level registries, no global configuration. Every agent carries its own config. Loggers are passed explicitly. Provider registries are created and injected, not imported from a shared module.

```typescript
// Each agent is self-contained
const a = agent({ name: "a", model: openai("gpt-4.1"), system: "..." });
const b = agent({ name: "b", model: openai("gpt-4.1-mini"), system: "..." });
// No shared state between a and b
```

## `$` is optional sugar

The StepBuilder (`$`) provides observability -- every `$.step()`, `$.agent()`, `$.map()` call becomes an entry in the execution trace. But it is not required. You can call agents directly, use plain loops, or mix traced and untraced operations. The trace just will not include untraced work.

```typescript
const pipeline = flowAgent(
  {
    name: "mixed",
    input: z.object({ text: z.string() }),
    output: z.object({ result: z.string() }),
  },
  async ({ input, $ }) => {
    // Traced -- appears in result.trace
    const analysis = await $.agent({ id: "analyze", agent: analyzer, input: input.text });

    // Untraced -- plain function call, not in trace
    let analysisText;
    if (analysis.ok) {
      analysisText = analysis.output;
    } else {
      analysisText = input.text;
    }
    const cleaned = cleanText(analysisText);

    // Traced again
    const final = await $.step({ id: "format", execute: () => formatOutput(cleaned) });

    if (final.ok) {
      return { result: final.output };
    }
    return { result: cleaned };
  },
);
```

## Agent vs FlowAgent

Both satisfy the `Runnable` interface -- same `.generate()`, `.stream()`, `.fn()`. The difference is internal:

|                           | `agent()`                                          | `flowAgent()`                                            |
| ------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| **What drives execution** | LLM tool loop                                      | Your handler code                                        |
| **When to use**           | Single model call, optionally with tools/subagents | Multi-step orchestration, conditional logic, parallelism |
| **State**                 | Managed by AI SDK                                  | Variables in your handler closure                        |
| **Trace**                 | Tool-loop steps via hooks                          | `$` step builder entries                                 |
| **Model required**        | Yes                                                | No (sub-agents provide their own models)                 |
| **Nesting**               | Can delegate to subagents                          | Can call `$.agent()` with any `Agent` or `FlowAgent`     |

Use `agent()` when a single LLM boundary is enough. Use `flowAgent()` when you need to coordinate multiple agents, implement retry logic, run parallel work, or apply custom control flow around LLM calls.
