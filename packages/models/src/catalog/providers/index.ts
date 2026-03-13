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
import { OPENAI_MODELS } from './openai.js'
import { ANTHROPIC_MODELS } from './anthropic.js'
import { GOOGLE_MODELS } from './google.js'
import { GOOGLE_VERTEX_MODELS } from './google-vertex.js'
import { MISTRAL_MODELS } from './mistral.js'
import { AMAZON_BEDROCK_MODELS } from './amazon-bedrock.js'
import { GROQ_MODELS } from './groq.js'
import { DEEPSEEK_MODELS } from './deepseek.js'
import { XAI_MODELS } from './xai.js'
import { COHERE_MODELS } from './cohere.js'
import { FIREWORKS_AI_MODELS } from './fireworks-ai.js'
import { TOGETHERAI_MODELS } from './togetherai.js'
import { DEEPINFRA_MODELS } from './deepinfra.js'
import { CEREBRAS_MODELS } from './cerebras.js'
import { PERPLEXITY_MODELS } from './perplexity.js'
import { OPENROUTER_MODELS } from './openrouter.js'
import { LLAMA_MODELS } from './llama.js'
import { ALIBABA_MODELS } from './alibaba.js'
import { NVIDIA_MODELS } from './nvidia.js'
import { HUGGINGFACE_MODELS } from './huggingface.js'
import { INCEPTION_MODELS } from './inception.js'

export const MODELS = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...GOOGLE_VERTEX_MODELS,
  ...MISTRAL_MODELS,
  ...AMAZON_BEDROCK_MODELS,
  ...GROQ_MODELS,
  ...DEEPSEEK_MODELS,
  ...XAI_MODELS,
  ...COHERE_MODELS,
  ...FIREWORKS_AI_MODELS,
  ...TOGETHERAI_MODELS,
  ...DEEPINFRA_MODELS,
  ...CEREBRAS_MODELS,
  ...PERPLEXITY_MODELS,
  ...OPENROUTER_MODELS,
  ...LLAMA_MODELS,
  ...ALIBABA_MODELS,
  ...NVIDIA_MODELS,
  ...HUGGINGFACE_MODELS,
  ...INCEPTION_MODELS,
] as const satisfies readonly ModelDefinition[]
