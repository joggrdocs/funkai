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

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek', family: 'deepseek-thinking', pricing: { input: 2.8e-7, output: 4.2e-7, cacheRead: 2.8e-8 }, contextWindow: 128000, maxOutput: 64000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: true, structuredOutput: false } },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', family: 'deepseek', pricing: { input: 2.8e-7, output: 4.2e-7, cacheRead: 2.8e-8 }, contextWindow: 128000, maxOutput: 8192, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: true, structuredOutput: false } },
] as const satisfies readonly ModelDefinition[]
