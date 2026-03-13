# Orchestrate Multiple Agents

Patterns for coordinating multiple agents: sequential chains, parallel execution, agent handoff, voting, and hierarchical delegation.

## Prerequisites

- `@pkg/agent-sdk` installed
- Familiarity with `agent()`, `workflow()`, `$.agent`, `$.map`, `$.all`, and `$.race`
- Understanding of subagents (the `agents` field on `AgentConfig`)

## Steps

### 1. Chain agents sequentially

Pass the output of one agent as input to the next using `$.agent` steps in sequence.

```ts
import { workflow, agent } from "@pkg/agent-sdk";
import { z } from "zod";

const researcher = agent({
  name: "researcher",
  model: "openai/gpt-4.1",
  input: z.object({ topic: z.string() }),
  prompt: ({ input }) => `Research the topic thoroughly:\n\n${input.topic}`,
});

const writer = agent({
  name: "writer",
  model: "openai/gpt-4.1",
  input: z.object({ research: z.string(), topic: z.string() }),
  prompt: ({ input }) =>
    `Write an article about "${input.topic}" using this research:\n\n${input.research}`,
});

const editor = agent({
  name: "editor",
  model: "openai/gpt-4.1",
  input: z.object({ draft: z.string() }),
  prompt: ({ input }) => `Edit this article for clarity and correctness:\n\n${input.draft}`,
});

const pipeline = workflow(
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
import { workflow, agent } from "@pkg/agent-sdk";
import { z } from "zod";

const translator = agent({
  name: "translator",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string(), targetLang: z.string() }),
  prompt: ({ input }) => `Translate to ${input.targetLang}:\n\n${input.text}`,
});

const batchTranslate = workflow(
  {
    name: "batch-translate",
    input: z.object({
      text: z.string(),
      languages: z.array(z.string()),
    }),
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
import { workflow, agent } from "@pkg/agent-sdk";
import { z } from "zod";

const sentimentAgent = agent({
  name: "sentiment",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Analyze the sentiment of this text:\n\n${input.text}`,
});

const summaryAgent = agent({
  name: "summary",
  model: "openai/gpt-4.1",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Summarize this text:\n\n${input.text}`,
});

const keywordAgent = agent({
  name: "keywords",
  model: "openai/gpt-4.1-mini",
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Extract keywords from this text:\n\n${input.text}`,
});

const analyze = workflow(
  {
    name: "parallel-analysis",
    input: z.object({ text: z.string() }),
    output: z.object({
      sentiment: z.string(),
      summary: z.string(),
      keywords: z.string(),
    }),
  },
  async ({ input, $ }) => {
    const results = await $.all({
      id: "analyze-parallel",
      entries: [
        () => sentimentAgent.generate({ text: input.text }),
        () => summaryAgent.generate({ text: input.text }),
        () => keywordAgent.generate({ text: input.text }),
      ],
    });

    if (!results.ok) {
      return { sentiment: "unknown", summary: "unavailable", keywords: "none" };
    }

    const [sentiment, summary, keywords] = results.value as readonly [
      Awaited<ReturnType<typeof sentimentAgent.generate>>,
      Awaited<ReturnType<typeof summaryAgent.generate>>,
      Awaited<ReturnType<typeof keywordAgent.generate>>,
    ];

    return {
      sentiment: sentiment.ok ? sentiment.output : "unknown",
      summary: summary.ok ? summary.output : "unavailable",
      keywords: keywords.ok ? keywords.output : "none",
    };
  },
);
```

### 4. Use subagents for agent handoff

Declare agents in the `agents` field to let the parent delegate tasks via function calling. The parent agent decides when to invoke the subagent.

```ts
import { agent } from "@pkg/agent-sdk";
import { z } from "zod";

const codeWriter = agent({
  name: "code-writer",
  model: "openai/gpt-4.1",
  input: z.object({ spec: z.string() }),
  prompt: ({ input }) => `Write TypeScript code for this specification:\n\n${input.spec}`,
});

const codeReviewer = agent({
  name: "code-reviewer",
  model: "openai/gpt-4.1",
  input: z.object({ code: z.string() }),
  prompt: ({ input }) => `Review this TypeScript code for bugs and improvements:\n\n${input.code}`,
});

const techLead = agent({
  name: "tech-lead",
  model: "openai/gpt-4.1",
  system: `You are a tech lead. Break down tasks and delegate:
- Use the code-writer agent to write code from specs.
- Use the code-reviewer agent to review written code.
Coordinate the work and provide the final result.`,
  agents: { codeWriter, codeReviewer },
});

// The tech lead decides when to call each subagent
const result = await techLead.generate("Build a rate limiter module");
```

### 5. Implement voting with multiple models

Race or poll multiple models and select the most common answer.

```ts
import { workflow, agent } from "@pkg/agent-sdk";
import { z } from "zod";

const OutputSchema = z.object({
  category: z.enum(["bug", "feature", "question"]),
  confidence: z.number(),
});

const classifierA = agent({
  name: "classifier-a",
  model: "openai/gpt-4.1",
  output: OutputSchema,
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\n${input.text}`,
});

const classifierB = agent({
  name: "classifier-b",
  model: "anthropic/claude-sonnet-4",
  output: OutputSchema,
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\n${input.text}`,
});

const classifierC = agent({
  name: "classifier-c",
  model: "openai/gpt-4.1-mini",
  output: OutputSchema,
  input: z.object({ text: z.string() }),
  prompt: ({ input }) => `Classify this issue:\n\n${input.text}`,
});

const majorityVote = (
  votes: ReadonlyArray<{ readonly category: string; readonly confidence: number }>,
): string => {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    counts.set(vote.category, (counts.get(vote.category) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
};

const voter = workflow(
  {
    name: "voting-classifier",
    input: z.object({ text: z.string() }),
    output: z.object({ category: z.string(), votes: z.number() }),
  },
  async ({ input, $ }) => {
    const agents = [classifierA, classifierB, classifierC] as const;

    const results = await $.map({
      id: "collect-votes",
      input: [...agents],
      concurrency: 3,
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

    return {
      category: validVotes.length > 0 ? majorityVote(validVotes) : "unknown",
      votes: validVotes.length,
    };
  },
);
```

### 6. Race agents for fastest response

Use `$.race` to get the first successful response from multiple providers or models.

```ts
import { workflow, agent } from "@pkg/agent-sdk";
import { z } from "zod";

const fastAgent = agent({
  name: "fast",
  model: "openai/gpt-4.1-mini",
  system: "Respond concisely.",
});

const qualityAgent = agent({
  name: "quality",
  model: "openai/gpt-4.1",
  system: "Respond concisely.",
});

const racingWorkflow = workflow(
  {
    name: "fastest-response",
    input: z.object({ question: z.string() }),
    output: z.object({ answer: z.string(), winner: z.string() }),
  },
  async ({ input, $ }) => {
    const result = await $.race({
      id: "race-models",
      entries: [
        () => fastAgent.generate(input.question).then((r) => ({ ...r, model: "fast" })),
        () => qualityAgent.generate(input.question).then((r) => ({ ...r, model: "quality" })),
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

Combine subagents with workflows for multi-level delegation. Each level can have its own subagents.

```ts
import { agent, workflow } from "@pkg/agent-sdk";
import { z } from "zod";

// Level 2: Specialist agents
const dataCollector = agent({
  name: "data-collector",
  model: "openai/gpt-4.1-mini",
  input: z.object({ query: z.string() }),
  prompt: ({ input }) => `Find relevant data for: ${input.query}`,
});

const dataAnalyst = agent({
  name: "data-analyst",
  model: "openai/gpt-4.1",
  input: z.object({ data: z.string() }),
  prompt: ({ input }) => `Analyze this data and provide insights:\n\n${input.data}`,
});

// Level 1: Team lead agents with subagents
const researchLead = agent({
  name: "research-lead",
  model: "openai/gpt-4.1",
  system: "You lead research. Use the data-collector to gather information.",
  agents: { dataCollector },
});

const analysisLead = agent({
  name: "analysis-lead",
  model: "openai/gpt-4.1",
  system: "You lead analysis. Use the data-analyst to analyze data.",
  agents: { dataAnalyst },
});

// Level 0: Top-level workflow
const project = workflow(
  {
    name: "research-project",
    input: z.object({ question: z.string() }),
    output: z.object({ findings: z.string(), analysis: z.string() }),
  },
  async ({ input, $ }) => {
    const research = await $.agent({
      id: "research-phase",
      agent: researchLead,
      input: `Research this question: ${input.question}`,
    });

    const analysis = await $.agent({
      id: "analysis-phase",
      agent: analysisLead,
      input: research.ok
        ? `Analyze these findings: ${research.value.output}`
        : `Analyze this question directly: ${input.question}`,
    });

    return {
      findings: research.ok ? research.value.output : "Research unavailable",
      analysis: analysis.ok ? analysis.value.output : "Analysis unavailable",
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

**Fix:** Improve the parent's `system` prompt to explicitly mention when to use the subagent. The parent decides via function calling, so the description matters.

### `$.all` returns wrong types

**Issue:** The `results.value` array has `unknown[]` type.

**Fix:** Cast the destructured values to the expected types. `$.all` returns `unknown[]` since entries can return different types.

### Race does not cancel losers

**Issue:** Losing entries continue executing after the winner resolves.

**Fix:** Entries must accept and respect the `AbortSignal` passed to their factory function. If using `agent.generate()` directly, the framework handles cancellation automatically. For custom async work, check `signal.aborted`.

### Agent handoff loses context

**Issue:** The subagent does not have access to the parent's conversation history.

**Fix:** Subagents start with a fresh context. Pass relevant information explicitly in the input. For multi-turn context, include the prior conversation as part of the subagent's input.

### Parallel agents hit rate limits

**Issue:** Running too many concurrent agent calls triggers provider rate limits.

**Fix:** Use the `concurrency` parameter on `$.map` to limit parallelism. Start with a low value (2-3) and increase based on your provider's rate limits.

## References

- [Agent](../core/agent.md)
- [Step Builder ($)](../core/step.md)
- [Create an Agent](create-agent.md)
- [Create a Workflow](create-workflow.md)
- [Hooks](../core/hooks.md)
- [Troubleshooting](../troubleshooting.md)
