# Orchestrate Multiple Agents

Patterns for coordinating multiple agents: sequential chains, parallel execution, agent handoff, voting, and hierarchical delegation.

## Prerequisites

- `@funkai/agents` installed
- Familiarity with `agent()`, `flowAgent()`, `$.agent`, `$.map`, `$.all`, and `$.race`
- Understanding of subagents (the `agents` field on `AgentConfig`)

## Steps

### 1. Chain agents sequentially

Pass the output of one agent as input to the next using `$.agent` steps in sequence.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const researcher = agent({
  name: "researcher",
  model: openai("gpt-4.1"),
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Research the topic thoroughly:\n\n${input.topic}`,
});

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  input: z.object({ research: z.string(), topic: z.string() }),
  prompt: ({ input }) =>
    `Write an article about "${input.topic}" using this research:\n\n${input.research}`,
});

const editor = agent({
  name: "editor",
  model: openai("gpt-4.1"),
  input: z.object({ draft: z.string() }),
  prompt: ({ input }) => `Edit this article for clarity and correctness:\n\n${input.draft}`,
});

const pipeline = flowAgent(
  {
    name: "content-pipeline",
    input: z.object({ topic: z.string() }),
    output: z.object({ article: z.string() }),
  },
  async ({ input, $ }) => {
    const research = await $.agent({
      id: "research",
      agent: researcher,
      input: { topic: input.topic },
    });
    if (!research.ok) return { article: "Research failed" };

    const draft = await $.agent({
      id: "write",
      agent: writer,
      input: { research: research.value.output, topic: input.topic },
    });
    if (!draft.ok) return { article: "Writing failed" };

    const edited = await $.agent({
      id: "edit",
      agent: editor,
      input: { draft: draft.value.output },
    });

    return { article: edited.ok ? edited.value.output : draft.value.output };
  },
);
```

### 2. Run agents in parallel with `$.map`

Process multiple inputs concurrently with the same agent using `$.map`.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const translator = agent({
  name: "translator",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string(), targetLang: z.string() }),
  prompt: ({ input }) => `Translate to ${input.targetLang}:\n\n${input.text}`,
});

const batchTranslate = flowAgent(
  {
    name: "batch-translate",
    input: z.object({ text: z.string(), languages: z.array(z.string()) }),
    output: z.object({
      translations: z.array(z.object({ language: z.string(), text: z.string() })),
    }),
  },
  async ({ input, $ }) => {
    const results = await $.map({
      id: "translate-all",
      input: input.languages,
      concurrency: 5,
      execute: async ({ item: language, $: step$ }) => {
        const result = await step$.agent({
          id: `translate-${language}`,
          agent: translator,
          input: { text: input.text, targetLang: language },
        });
        return {
          language,
          text: result.ok ? result.value.output : `Translation to ${language} failed`,
        };
      },
    });

    return { translations: results.ok ? results.value : [] };
  },
);
```

### 3. Run heterogeneous agents in parallel with `$.all`

When different agents need to run concurrently on different tasks, use `$.all`.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const sentimentAgent = agent({
  name: "sentiment",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Analyze the sentiment of this text:\n\n${input.text}`,
});

const summaryAgent = agent({
  name: "summary",
  model: openai("gpt-4.1"),
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize this text:\n\n${input.text}`,
});

const analyze = flowAgent(
  {
    name: "parallel-analysis",
    input: z.object({ text: z.string() }),
    output: z.object({ sentiment: z.string(), summary: z.string() }),
  },
  async ({ input, $ }) => {
    const results = await $.all({
      id: "analyze-parallel",
      entries: [
        (signal) => sentimentAgent.generate({ input: { text: input.text }, signal }),
        (signal) => summaryAgent.generate({ input: { text: input.text }, signal }),
      ],
    });

    if (!results.ok) {
      return { sentiment: "unknown", summary: "unavailable" };
    }

    const [sentiment, summary] = results.value as readonly [
      Awaited<ReturnType<typeof sentimentAgent.generate>>,
      Awaited<ReturnType<typeof summaryAgent.generate>>,
    ];

    return {
      sentiment: sentiment.ok ? sentiment.output : "unknown",
      summary: summary.ok ? summary.output : "unavailable",
    };
  },
);
```

### 4. Use subagents for agent handoff

Declare agents in the `agents` field to let the parent delegate tasks via function calling.

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const codeWriter = agent({
  name: "code-writer",
  model: openai("gpt-4.1"),
  input: z.object({ spec: z.string() }),
  prompt: ({ input }) => `Write TypeScript code for this specification:\n\n${input.spec}`,
});

const codeReviewer = agent({
  name: "code-reviewer",
  model: openai("gpt-4.1"),
  input: z.object({ code: z.string() }),
  prompt: ({ input }) => `Review this TypeScript code for bugs and improvements:\n\n${input.code}`,
});

const techLead = agent({
  name: "tech-lead",
  model: openai("gpt-4.1"),
  system: `You are a tech lead. Break down tasks and delegate:
- Use the code-writer agent to write code from specs.
- Use the code-reviewer agent to review written code.
Coordinate the work and provide the final result.`,
  agents: { codeWriter, codeReviewer },
});

const result = await techLead.generate({ prompt: "Build a rate limiter module" });
```

### 5. Implement voting with multiple models

Race or poll multiple models and select the most common answer.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const OutputSchema = z.object({
  category: z.enum(["bug", "feature", "question"]),
  confidence: z.number(),
});

const classifierA = agent({
  name: "classifier-a",
  model: openai("gpt-4.1"),
  output: OutputSchema,
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\n${input.text}`,
});

const classifierB = agent({
  name: "classifier-b",
  model: anthropic("claude-sonnet-4-20250514"),
  output: OutputSchema,
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\n${input.text}`,
});

const voter = flowAgent(
  {
    name: "voting-classifier",
    input: z.object({ text: z.string() }),
    output: z.object({ category: z.string(), votes: z.number() }),
  },
  async ({ input, $ }) => {
    const results = await $.map({
      id: "collect-votes",
      input: [classifierA, classifierB],
      concurrency: 2,
      execute: async ({ item: classifier, index, $ }) => {
        const result = await $.agent({
          id: `vote-${index}`,
          agent: classifier,
          input: { text: input.text },
        });
        return result.ok ? result.value.output : { category: "unknown" as const, confidence: 0 };
      },
    });

    const votes = results.ok ? results.value : [];
    const validVotes = votes.filter((v) => v.category !== "unknown");

    const counts = new Map<string, number>();
    for (const vote of validVotes) {
      counts.set(vote.category, (counts.get(vote.category) ?? 0) + 1);
    }
    let best = "unknown";
    let bestCount = 0;
    for (const [category, count] of counts) {
      if (count > bestCount) {
        best = category;
        bestCount = count;
      }
    }

    return { category: best, votes: validVotes.length };
  },
);
```

### 6. Race agents for fastest response

Use `$.race` to get the first successful response from multiple providers.

```ts
import { flowAgent, agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const fastAgent = agent({
  name: "fast",
  model: openai("gpt-4.1-mini"),
  system: "Respond concisely.",
});

const qualityAgent = agent({
  name: "quality",
  model: openai("gpt-4.1"),
  system: "Respond concisely.",
});

const racingFlowAgent = flowAgent(
  {
    name: "fastest-response",
    input: z.object({ question: z.string() }),
    output: z.object({ answer: z.string(), winner: z.string() }),
  },
  async ({ input, $ }) => {
    const result = await $.race({
      id: "race-models",
      entries: [
        (signal) =>
          fastAgent
            .generate({ prompt: input.question, signal })
            .then((r) => ({ ...r, model: "fast" })),
        (signal) =>
          qualityAgent
            .generate({ prompt: input.question, signal })
            .then((r) => ({ ...r, model: "quality" })),
      ],
    });

    if (!result.ok) {
      return { answer: "No response available", winner: "none" };
    }

    const winner = result.value as { ok: boolean; output: string; model: string };
    return {
      answer: winner.ok ? winner.output : "Response failed",
      winner: winner.model,
    };
  },
);
```

### 7. Build hierarchical agent trees

Combine subagents with flow agents for multi-level delegation.

```ts
import { agent, flowAgent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const dataCollector = agent({
  name: "data-collector",
  model: openai("gpt-4.1-mini"),
  input: z.object({ query: z.string() }),
  prompt: ({ input }) => `Find relevant data for: ${input.query}`,
});

const researchLead = agent({
  name: "research-lead",
  model: openai("gpt-4.1"),
  system: "You lead research. Use the data-collector to gather information.",
  agents: { dataCollector },
});

const project = flowAgent(
  {
    name: "research-project",
    input: z.object({ question: z.string() }),
    output: z.object({ findings: z.string() }),
  },
  async ({ input, $ }) => {
    const research = await $.agent({
      id: "research-phase",
      agent: researchLead,
      input: `Research this question: ${input.question}`,
    });

    return {
      findings: research.ok ? research.value.output : "Research unavailable",
    };
  },
);
```

## Verification

- Sequential chains pass output from one agent to the next
- `$.map` processes items concurrently up to the `concurrency` limit
- `$.all` runs heterogeneous agents concurrently and returns results in entry order
- Subagents appear as callable tools in the parent agent's context
- `$.race` returns the first result and cancels remaining entries
- Abort signals propagate from parent to child agents

## Troubleshooting

### Subagent never gets called

**Issue:** The parent agent does not invoke the subagent during its tool loop.

**Fix:** Improve the parent's `system` prompt to explicitly mention when to use the subagent.

### `$.all` returns wrong types

**Issue:** The `results.value` array has `unknown[]` type.

**Fix:** Cast the destructured values to the expected types.

### Race does not cancel losers

**Issue:** Losing entries continue executing after the winner resolves.

**Fix:** Entries must accept and respect the `AbortSignal` passed to their factory function.

### Agent handoff loses context

**Issue:** The subagent does not have access to the parent's conversation history.

**Fix:** Subagents start with a fresh context. Pass relevant information explicitly in the input.

### Parallel agents hit rate limits

**Issue:** Running too many concurrent agent calls triggers provider rate limits.

**Fix:** Use the `concurrency` parameter on `$.map` to limit parallelism.

## References

- [`agent()` reference](/reference/agents/agent)
- [`flowAgent()` reference](/reference/agents/flow-agent)
