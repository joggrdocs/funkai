import { openai } from "@ai-sdk/openai";
import { agent } from "@funkai/agents";
import { prompts } from "~prompts";

const writer = agent({
  name: "writer",
  model: openai("gpt-4.1"),
  system: prompts.agents.writer.render({
    tone: "friendly",
    context: "You are writing for a developer audience.",
  }),
});

const result = await writer.generate({ prompt: "Write a short guide on closures in JavaScript" });

if (result.ok) {
  console.log("Output:", result.output);
  console.log("Usage:", result.usage);
} else {
  console.error("Error:", result.error);
}
