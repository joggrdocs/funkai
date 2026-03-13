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

export const LLAMA_MODELS: readonly ModelDefinition[] = [
  { id: 'cerebras-llama-4-maverick-17b-128e-instruct', name: 'Cerebras-Llama-4-Maverick-17B-128E-Instruct', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'llama-4-scout-17b-16e-instruct-fp8', name: 'Llama-4-Scout-17B-16E-Instruct-FP8', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'llama-3.3-8b-instruct', name: 'Llama-3.3-8B-Instruct', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'groq-llama-4-maverick-17b-128e-instruct', name: 'Groq-Llama-4-Maverick-17B-128E-Instruct', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'llama-3.3-70b-instruct', name: 'Llama-3.3-70B-Instruct', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'cerebras-llama-4-scout-17b-16e-instruct', name: 'Cerebras-Llama-4-Scout-17B-16E-Instruct', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'llama-4-maverick-17b-128e-instruct-fp8', name: 'Llama-4-Maverick-17B-128E-Instruct-FP8', provider: 'llama', family: 'llama', pricing: { input: 0, output: 0 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
] as const
