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

export const CEREBRAS_MODELS: readonly ModelDefinition[] = [
  { id: 'qwen-3-235b-a22b-instruct-2507', name: 'Qwen 3 235B Instruct', provider: 'cerebras', family: 'qwen', pricing: { input: 6e-7, output: 0.0000012 }, contextWindow: 131000, maxOutput: 32000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'gpt-oss-120b', name: 'GPT OSS 120B', provider: 'cerebras', family: 'gpt-oss', pricing: { input: 2.5e-7, output: 6.9e-7 }, contextWindow: 131072, maxOutput: 32768, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'llama3.1-8b', name: 'Llama 3.1 8B', provider: 'cerebras', family: 'llama', pricing: { input: 1.0000000000000001e-7, output: 1.0000000000000001e-7 }, contextWindow: 32000, maxOutput: 8000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'zai-glm-4.7', name: 'Z.AI GLM-4.7', provider: 'cerebras', family: '', pricing: { input: 0.00000225, output: 0.00000275 }, contextWindow: 131072, maxOutput: 40000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
] as const
