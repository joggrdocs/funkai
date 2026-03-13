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

export const PERPLEXITY_MODELS = [
  { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', provider: 'perplexity', family: 'sonar-reasoning', pricing: { input: 0.000002, output: 0.000008 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: true, toolCall: false, attachment: true, structuredOutput: false } },
  { id: 'sonar', name: 'Sonar', provider: 'perplexity', family: 'sonar', pricing: { input: 0.000001, output: 0.000001 }, contextWindow: 128000, maxOutput: 4096, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: false, attachment: false, structuredOutput: false } },
  { id: 'sonar-deep-research', name: 'Perplexity Sonar Deep Research', provider: 'perplexity', family: '', pricing: { input: 0.000002, output: 0.000008 }, contextWindow: 128000, maxOutput: 32768, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: false, attachment: false, structuredOutput: false } },
  { id: 'sonar-pro', name: 'Sonar Pro', provider: 'perplexity', family: 'sonar-pro', pricing: { input: 0.000003, output: 0.000015 }, contextWindow: 200000, maxOutput: 8192, modalities: { input: ["text","image"], output: ["text"] }, capabilities: { reasoning: false, toolCall: false, attachment: true, structuredOutput: false } },
] as const satisfies readonly ModelDefinition[]
