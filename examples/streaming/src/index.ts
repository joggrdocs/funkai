import { agent, flowAgent, model } from '@funkai/agents'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Streaming with agents and flow agents
// ---------------------------------------------------------------------------

// 1. Agent streaming — stream text output as it's generated

const writer = agent({
  name: 'writer',
  model: model('openai/gpt-4o-mini'),
  system: 'You are a creative writer. Write short, engaging content.',
})

console.log('=== Agent Streaming ===\n')

const agentResult = await writer.stream('Write a haiku about TypeScript.')

if (agentResult.ok) {
  // Read text chunks as they arrive
  const reader = agentResult.stream.getReader()

  process.stdout.write('Streaming: ')
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    process.stdout.write(value)
  }
  console.log('\n')

  // Final output is available after the stream completes
  const output = await agentResult.output
  console.log('Final output:', output)
  console.log('Usage:', await agentResult.usage)
} else {
  console.error('Agent stream error:', agentResult.error)
}

// ---------------------------------------------------------------------------
// 2. Flow agent streaming — stream step progress events
// ---------------------------------------------------------------------------

const researcher = agent({
  name: 'researcher',
  model: model('openai/gpt-4o-mini'),
  system: 'Answer questions concisely in one sentence.',
})

const researchFlow = flowAgent(
  {
    name: 'research-flow',
    input: z.object({ topics: z.array(z.string()) }),
    output: z.object({
      findings: z.array(z.object({ topic: z.string(), answer: z.string() })),
    }),
  },
  async ({ input, $ }) => {
    const mapResult = await $.map({
      id: 'research-topics',
      input: input.topics,
      execute: async ({ item }) => {
        // Stream the sub-agent through the flow's stream
        const result = await $.agent({
          id: `research-${item}`,
          agent: researcher,
          input: `What is ${item}?`,
          stream: true,
        })

        if (!result.ok) {
          return { topic: item, answer: 'Error' }
        }

        return { topic: item, answer: result.value.output as string }
      },
    })

    if (!mapResult.ok) {
      throw new Error(`Research failed: ${mapResult.error.message}`)
    }

    return { findings: mapResult.value }
  }
)

console.log('=== Flow Agent Streaming ===\n')

const flowResult = await researchFlow.stream({
  topics: ['TypeScript', 'Rust'],
})

if (flowResult.ok) {
  // Read step events as JSON strings
  const reader = flowResult.stream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Each chunk is a JSON string — tool-call or tool-result event
    try {
      const event = JSON.parse(value)
      console.log(`[${event.type}] ${event.toolName ?? ''}`)
    } catch {
      // Text chunks from streamed sub-agents
      process.stdout.write(value)
    }
  }

  console.log('\n')

  const output = await flowResult.output
  console.log('Findings:', JSON.stringify(output, null, 2))
} else {
  console.error('Flow stream error:', flowResult.error)
}
