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

export const INCEPTION_MODELS: readonly ModelDefinition[] = [
  { id: 'mercury-2', name: 'Mercury 2', provider: 'inception', family: 'mercury', pricing: { input: 2.5e-7, output: 7.5e-7, cacheRead: 2.5000000000000002e-8 }, contextWindow: 128000, maxOutput: 50000, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: true, attachment: false, structuredOutput: true } },
  { id: 'mercury', name: 'Mercury', provider: 'inception', family: 'mercury', pricing: { input: 2.5e-7, output: 0.000001, cacheRead: 2.5e-7, cacheWrite: 0.000001 }, contextWindow: 128000, maxOutput: 16384, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
  { id: 'mercury-edit', name: 'Mercury Edit', provider: 'inception', family: '', pricing: { input: 2.5e-7, output: 7.5e-7, cacheRead: 2.5000000000000002e-8 }, contextWindow: 128000, maxOutput: 8192, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: true, toolCall: false, attachment: false, structuredOutput: false } },
  { id: 'mercury-coder', name: 'Mercury Coder', provider: 'inception', family: 'mercury', pricing: { input: 2.5e-7, output: 0.000001, cacheRead: 2.5e-7, cacheWrite: 0.000001 }, contextWindow: 128000, maxOutput: 16384, modalities: { input: ["text"], output: ["text"] }, capabilities: { reasoning: false, toolCall: true, attachment: false, structuredOutput: false } },
] as const
