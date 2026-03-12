import { agent, model } from "@funkai/agents";
import { prompts } from "~prompts";

// ---------------------------------------------------------------------------
// 1. Create an agent using a typed prompt
// ---------------------------------------------------------------------------

const writer = agent({
  name: "writer",
  model: model("openai/gpt-4.1"),
  system: prompts.agents.writer.render({
    tone: "friendly",
    context: "You are writing for a developer audience.",
  }),
});

// ---------------------------------------------------------------------------
// 2. Run the agent
// ---------------------------------------------------------------------------

const result = await writer.generate("Write a short guide on closures in JavaScript");

if (result.ok) {
  console.log("Output:", result.output);
  console.log("Usage:", result.usage);
} else {
  console.error("Error:", result.error);
}
