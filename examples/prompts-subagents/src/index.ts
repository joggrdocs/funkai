import { agent, flowAgent, model } from "@funkai/agents";
import { prompts } from "~prompts";
import { z } from "zod";

// ---------------------------------------------------------------------------
// 1. Define agents with typed prompts
// ---------------------------------------------------------------------------

const researcher = agent({
  name: "researcher",
  model: model("openai/gpt-4.1"),
  system: prompts.agents.researcher.render({
    domain: "software engineering",
  }),
});

const writer = agent({
  name: "writer",
  model: model("openai/gpt-4.1"),
  system: prompts.agents.writer.render({
    tone: "friendly",
    audience: "senior engineers",
  }),
});

const reviewer = agent({
  name: "reviewer",
  model: model("openai/gpt-4o-mini"),
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
    model: model("openai/gpt-4.1"),
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
      prompt: `Research the topic: ${input.topic}`,
    });

    const draft = await $.agent({
      id: "draft",
      agent: writer,
      prompt: `Write an article based on these findings:\n${research.output}`,
    });

    const review = await $.agent({
      id: "review",
      agent: reviewer,
      prompt: `Review this article:\n${draft.output}`,
    });

    return {
      article: draft.output,
      verdict: review.output,
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
