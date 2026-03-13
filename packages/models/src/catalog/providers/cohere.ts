// ──────────────────────────────────────────────────────────────
// ███████╗██╗   ██╗███╗   ██╗██╗  ██╗ █████╗ ██╗
// ██╔════╝██║   ██║████╗  ██║██║ ██╔╝██╔══██╗██║
// █████╗  ██║   ██║██╔██╗ ██║█████╔╝ ███████║██║
// ██╔══╝  ██║   ██║██║╚██╗██║██╔═██╗ ██╔══██║██║
// ██║     ╚██████╔╝██║ ╚████║██║  ██╗██║  ██║██║
// ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝
//
// AUTO-GENERATED — DO NOT EDIT
// Source: https://models.dev
// Update: pnpm --filter=@funkai/models generate:models
// ──────────────────────────────────────────────────────────────

import type { ModelDefinition } from '../types.js'

export const COHERE_MODELS: readonly ModelDefinition[] = [
  { id: 'c4ai-aya-expanse-32b', name: 'Aya Expanse 32B', provider: 'cohere', family: '', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-a-03-2025', name: 'Command A', provider: 'cohere', family: 'command-a', pricing: { input: 0.0000025, output: 0.00001 }, contextWindow: 256000, maxOutput: 8000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-r7b-arabic-02-2025', name: 'Command R7B Arabic', provider: 'cohere', family: 'command-r', pricing: { input: 3.75e-8, output: 1.5e-7 }, contextWindow: 128000, maxOutput: 4000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-a-translate-08-2025', name: 'Command A Translate', provider: 'cohere', family: 'command-a', pricing: { input: 0.0000025, output: 0.00001 }, contextWindow: 8000, maxOutput: 8000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-r-08-2024', name: 'Command R', provider: 'cohere', family: 'command-r', pricing: { input: 1.5e-7, output: 6e-7 }, contextWindow: 128000, maxOutput: 4000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-r-plus-08-2024', name: 'Command R+', provider: 'cohere', family: 'command-r', pricing: { input: 0.0000025, output: 0.00001 }, contextWindow: 128000, maxOutput: 4000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-a-reasoning-08-2025', name: 'Command A Reasoning', provider: 'cohere', family: 'command-a', pricing: { input: 0.0000025, output: 0.00001 }, contextWindow: 256000, maxOutput: 32000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'c4ai-aya-expanse-8b', name: 'Aya Expanse 8B', provider: 'cohere', family: '', pricing: { input: 0, output: 0 }, contextWindow: 8000, maxOutput: 4000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'c4ai-aya-vision-8b', name: 'Aya Vision 8B', provider: 'cohere', family: '', pricing: { input: 0, output: 0 }, contextWindow: 16000, maxOutput: 4000, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'c4ai-aya-vision-32b', name: 'Aya Vision 32B', provider: 'cohere', family: '', pricing: { input: 0, output: 0 }, contextWindow: 16000, maxOutput: 4000, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'command-r7b-12-2024', name: 'Command R7B', provider: 'cohere', family: 'command-r', pricing: { input: 3.75e-8, output: 1.5e-7 }, contextWindow: 128000, maxOutput: 4000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'command-a-vision-07-2025', name: 'Command A Vision', provider: 'cohere', family: 'command-a', pricing: { input: 0.0000025, output: 0.00001 }, contextWindow: 128000, maxOutput: 8000, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: false, toolCall: false, attachment: false, structuredOutput: false } },
] as const
