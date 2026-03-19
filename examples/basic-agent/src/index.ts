import { openai } from "@ai-sdk/openai";
import { agent, evolve, tool } from "@funkai/agents";
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

// ---------------------------------------------------------------------------
// Base agent — shared config that all variants inherit
// ---------------------------------------------------------------------------
const weatherAgent = agent({
  name: "weather-agent",
  model: openai("gpt-4o-mini"),
  system:
    "You are a helpful weather assistant. Use the get-weather tool to answer questions about the weather.",
  tools: { "get-weather": weatherTool },
});

// ---------------------------------------------------------------------------
// Evolved agent — swap model dynamically based on the prompt
// ---------------------------------------------------------------------------
const smartWeatherAgent = evolve(weatherAgent, {
  name: "weather-agent-smart",
  model: openai("gpt-4.1"),
  system: ({ input }) => {
    if (typeof input === "string" && input.includes("detailed")) {
      return "You are a detailed weather analyst. Provide comprehensive weather information including forecasts and trends.";
    }
    return "You are a helpful weather assistant. Use the get-weather tool to answer questions about the weather.";
  },
});

// ---------------------------------------------------------------------------
// Run both agents
// ---------------------------------------------------------------------------
const result = await weatherAgent.generate("What is the weather in San Francisco?");

if (result.ok) {
  console.log("Output:", result.output);
  console.log("Messages:", result.messages.length);
  console.log("Usage:", result.usage);
} else {
  console.error("Error:", result.error);
}

const detailedResult = await smartWeatherAgent.generate(
  "Give me a detailed weather report for New York",
);

if (detailedResult.ok) {
  console.log("\nSmart Agent Output:", detailedResult.output);
} else {
  console.error("Error:", detailedResult.error);
}
