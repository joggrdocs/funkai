import { agent, flowAgent } from "@funkai/agents";
import { z } from "zod";
import { prompts } from "~prompts";

// ---------------------------------------------------------------------------
// 1. Define agents with typed prompts
// ---------------------------------------------------------------------------

const researcher = agent({
  name: "researcher",
  model: "openai/gpt-4.1",
  system: prompts.agents.researcher.render({
    domain: "software engineering",
  }),
});

const writer = agent({
  name: "writer",
  model: "openai/gpt-4.1",
  system: prompts.agents.writer.render({
    tone: "friendly",
    audience: "senior engineers",
  }),
});

const reviewer = agent({
  name: "reviewer",
  model: "openai/gpt-4o-mini",
  system: prompts.agents.reviewer.render({
    standard: "technical blog post",
  }),
});

// ---------------------------------------------------------------------------
// 2. Orchestrate with a flow agent
// ---------------------------------------------------------------------------

const pipeline = flowAgent(
  {
    name: "content-pipeline",
    input: z.object({
      topic: z.string(),
    }),
    output: z.object({
      article: z.string(),
      verdict: z.string(),
    }),
  },
  async ({ input, $ }) => {
    const research = await $.agent({
      id: "research",
      agent: researcher,
      input: `Research the topic: ${input.topic}`,
    });

    if (!research.ok) {
      throw new Error(`Research failed: ${research.error.message}`);
    }

    const draft = await $.agent({
      id: "draft",
      agent: writer,
      input: `Write an article based on these findings:\n${research.value.output}`,
    });

    if (!draft.ok) {
      throw new Error(`Draft failed: ${draft.error.message}`);
    }

    const review = await $.agent({
      id: "review",
      agent: reviewer,
      input: `Review this article:\n${draft.value.output}`,
    });

    if (!review.ok) {
      throw new Error(`Review failed: ${review.error.message}`);
    }

    return {
      article: String(draft.value.output),
      verdict: String(review.value.output),
    };
  },
);

// ---------------------------------------------------------------------------
// 3. Run the pipeline
// ---------------------------------------------------------------------------

const result = await pipeline.generate({
  topic: "functional programming patterns in TypeScript",
});

if (result.ok) {
  console.log("Article:", result.output.article);
  console.log("Verdict:", result.output.verdict);
  console.log("Trace:", result.trace);
} else {
  console.error("Error:", result.error);
}
