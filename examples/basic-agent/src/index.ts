import { agent, model, tool } from '@funkai/agents'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// 1. Define a tool the agent can use
// ---------------------------------------------------------------------------

const weatherTool = tool({
  name: 'get-weather',
  description: 'Get the current weather for a city',
  input: z.object({
    city: z.string().describe('City name'),
  }),
  execute: async ({ input }) => {
    // Simulated weather data
    const temps: Record<string, number> = {
      'San Francisco': 62,
      'New York': 75,
      London: 58,
    }
    const temp = temps[input.city] ?? 70
    return { city: input.city, temperature: temp, unit: 'F' }
  },
})

// ---------------------------------------------------------------------------
// 2. Create a basic agent with a model, system prompt, and tools
// ---------------------------------------------------------------------------

const weatherAgent = agent({
  name: 'weather-agent',
  model: model('openai/gpt-4o-mini'),
  system: 'You are a helpful weather assistant. Use the get-weather tool to answer questions about the weather.',
  tools: [weatherTool],
})

// ---------------------------------------------------------------------------
// 3. Run the agent
// ---------------------------------------------------------------------------

const result = await weatherAgent.generate('What is the weather in San Francisco?')

if (result.ok) {
  console.log('Output:', result.output)
  console.log('Messages:', result.messages.length)
  console.log('Usage:', result.usage)
} else {
  console.error('Error:', result.error)
}
