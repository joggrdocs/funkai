import { agent, flowAgent, model, tool } from '@funkai/agents'
import type { Message } from '@funkai/agents'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// 1. Agent streaming with tool call observation via onStepFinish
//
// The agent stream (`ReadableStream<string>`) only delivers text deltas.
// Tool calls are processed internally by the tool loop. To observe them
// as they happen, use the `onStepFinish` hook. After the stream completes,
// the full tool call/result history is available via `messages`.
// ---------------------------------------------------------------------------

const lookupTool = tool({
  name: 'lookup-capital',
  description: 'Look up the capital of a country',
  input: z.object({
    country: z.string().describe('Country name'),
  }),
  execute: async ({ input }) => {
    const capitals: Record<string, string> = {
      France: 'Paris',
      Japan: 'Tokyo',
      Brazil: 'Brasília',
      Australia: 'Canberra',
    }
    return { capital: capitals[input.country] ?? 'Unknown' }
  },
})

const geographyAgent = agent({
  name: 'geography',
  model: model('openai/gpt-4o-mini'),
  system: 'You are a geography expert. Use the lookup-capital tool to answer questions about capitals.',
  tools: { 'lookup-capital': lookupTool },

  // --- Observe tool calls as they happen during streaming ---
  onStepFinish: ({ stepId, toolCalls, toolResults, usage }) => {
    if (toolCalls.length > 0) {
      console.log(`\n[step ${stepId}] Tool calls:`)
      for (const tc of toolCalls) {
        console.log(`  → ${tc.toolName} (${tc.argsTextLength} chars args)`)
      }
    }
    if (toolResults.length > 0) {
      console.log(`[step ${stepId}] Tool results:`)
      for (const tr of toolResults) {
        console.log(`  ← ${tr.toolName} (${tr.resultTextLength} chars result)`)
      }
    }
    if (usage.totalTokens > 0) {
      console.log(`[step ${stepId}] Tokens: ${usage.inputTokens} in / ${usage.outputTokens} out`)
    }
  },
})

console.log('=== Agent Streaming with Tool Calls ===\n')

const streamResult = await geographyAgent.stream(
  'What are the capitals of France and Japan? Answer in a single sentence.'
)

if (streamResult.ok) {
  // Stream text deltas to stdout as they arrive
  const reader = streamResult.stream.getReader()
  process.stdout.write('Response: ')
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    process.stdout.write(value)
  }
  console.log('\n')

  // After stream completes, inspect the full message history
  const messages: Message[] = await streamResult.messages
  console.log('--- Full Message History ---')
  for (const msg of messages) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (typeof part === 'object' && 'type' in part && part.type === 'tool-call') {
          console.log(`  [assistant] tool-call: ${part.toolName}(${JSON.stringify(part.args)})`)
        }
      }
    }
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (typeof part === 'object' && 'type' in part && part.type === 'tool-result') {
          console.log(`  [tool]      result: ${JSON.stringify(part.result)}`)
        }
      }
    }
  }

  const usage = await streamResult.usage
  console.log(`\nTotal usage: ${usage.inputTokens} in / ${usage.outputTokens} out / ${usage.totalTokens} total`)
} else {
  console.error('Error:', streamResult.error)
}

// ---------------------------------------------------------------------------
// 2. Flow agent streaming — step events as tool-call/tool-result pairs
//
// When a flow agent streams, `$.agent({ stream: true })` pipes the
// sub-agent's text through the flow's stream. The flow also emits
// synthetic tool-call and tool-result messages for each `$` step,
// available in `result.messages` after completion.
//
// The flow's `onStepStart` / `onStepFinish` hooks give real-time
// visibility into step execution.
// ---------------------------------------------------------------------------

console.log('\n=== Flow Agent Streaming ===\n')

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

    // Observe each $ step in real time
    onStepStart: ({ step }) => {
      console.log(`[step:start] ${step.id} (type: ${step.type}, index: ${step.index})`)
    },
    onStepFinish: ({ step, duration }) => {
      console.log(`[step:finish] ${step.id} (${duration}ms)`)
    },
  },
  async ({ input, $ }) => {
    // $.map runs all topics in parallel, each as a tracked step
    const mapResult = await $.map({
      id: 'research-topics',
      input: input.topics,
      execute: async ({ item }) => {
        // stream: true pipes the sub-agent's text through the flow's stream
        const result = await $.agent({
          id: `research-${item}`,
          agent: researcher,
          input: `What is ${item}?`,
          stream: true,
        })

        if (!result.ok) {
          return { topic: item, answer: `Error: ${result.error.message}` }
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

const flowResult = await researchFlow.stream({
  topics: ['TypeScript', 'Rust', 'Go'],
})

if (flowResult.ok) {
  // Read text deltas from sub-agents piped through the flow stream
  const reader = flowResult.stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    process.stdout.write(value)
  }
  console.log()

  // After completion, the flow's messages contain synthetic tool-call/result
  // pairs for every $ step — useful for observability and replay
  const output = await flowResult.output
  console.log('\nFindings:', JSON.stringify(output, null, 2))

  const messages: Message[] = await flowResult.messages
  console.log(`\nFlow produced ${messages.length} messages (including synthetic tool-call/result pairs for each step)`)
} else {
  console.error('Error:', flowResult.error)
}
