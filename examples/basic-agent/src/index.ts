import { openai } from "@ai-sdk/openai";
import { agent, tool } from "@funkai/agents";
import { z } from "zod";

const weatherTool = tool({
  description: "Get the current weather for a city",
  inputSchema: z.object({
    city: z.string().describe("City name"),
  }),
  execute: async (input) => {
    // Simulated weather data
    const temps: Record<string, number> = {
      "San Francisco": 62,
      "New York": 75,
      London: 58,
    };
    const temp = temps[input.city] ?? 70;
    return { city: input.city, temperature: temp, unit: "F" };
  },
});

const weatherAgent = agent({
  name: "weather-agent",
  model: openai("gpt-4o-mini"),
  system:
    "You are a helpful weather assistant. Use the get-weather tool to answer questions about the weather.",
  tools: { "get-weather": weatherTool },
});

const result = await weatherAgent.generate("What is the weather in San Francisco?");

if (result.ok) {
  console.log("Output:", result.output);
  console.log("Messages:", result.messages.length);
  console.log("Usage:", result.usage);
} else {
  console.error("Error:", result.error);
}
