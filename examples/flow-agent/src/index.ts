import { agent, flowAgent, model } from '@funkai/agents'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Flow agents are imperative handlers that use `$` for tracked operations.
// State is just variables. `$` gives you observability, traces, and hooks.
// ---------------------------------------------------------------------------

// 1. Define sub-agents that the flow will orchestrate

const summarizer = agent({
  name: 'summarizer',
  model: model('openai/gpt-4o-mini'),
  system: 'Summarize the given text in one sentence.',
})

const translator = agent({
  name: 'translator',
  model: model('openai/gpt-4o-mini'),
  system: 'Translate the given text to Spanish.',
})

// ---------------------------------------------------------------------------
// 2. Create a flow agent that orchestrates multiple agents
// ---------------------------------------------------------------------------

const summarizeAndTranslate = flowAgent(
  {
    name: 'summarize-and-translate',
    input: z.object({ text: z.string() }),
    output: z.object({
      summary: z.string(),
      translation: z.string(),
    }),
    onStepStart: ({ step }) => {
      console.log(`  → step started: ${step.id} (${step.type})`)
    },
    onStepFinish: ({ step, duration }) => {
      console.log(`  ✓ step finished: ${step.id} (${duration}ms)`)
    },
  },
  async ({ input, $ }) => {
    // Step 1: Summarize
    const summaryResult = await $.agent({
      id: 'summarize',
      agent: summarizer,
      input: input.text,
    })

    if (!summaryResult.ok) {
      throw new Error(`Summarization failed: ${summaryResult.error.message}`)
    }

    const summary = summaryResult.value.output as string

    // Step 2: Translate the summary
    const translationResult = await $.agent({
      id: 'translate',
      agent: translator,
      input: summary,
    })

    if (!translationResult.ok) {
      throw new Error(`Translation failed: ${translationResult.error.message}`)
    }

    return {
      summary,
      translation: translationResult.value.output as string,
    }
  }
)

// ---------------------------------------------------------------------------
// 3. Run the flow
// ---------------------------------------------------------------------------

const result = await summarizeAndTranslate.generate({
  text: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and class-based object-oriented programming to the language.',
})

if (result.ok) {
  console.log('\nResult:')
  console.log('  Summary:', result.output.summary)
  console.log('  Translation:', result.output.translation)
  console.log('  Duration:', result.duration, 'ms')
  console.log('  Trace entries:', result.trace.length)
} else {
  console.error('Error:', result.error)
}
