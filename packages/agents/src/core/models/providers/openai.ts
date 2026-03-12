// ──────────────────────────────────────────────────────────────
//  █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗
// ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║
// ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
//
// AUTO-GENERATED — DO NOT EDIT
// Update: pnpm --filter=@pkg/agent-sdk generate:models
// ──────────────────────────────────────────────────────────────

export const OPENAI_MODELS = [
  {
    id: "openai/gpt-5.2-codex",
    category: "coding",
    pricing: { prompt: 0.00000175, completion: 0.000014, inputCacheRead: 1.75e-7, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-5.2",
    category: "chat",
    pricing: { prompt: 0.00000175, completion: 0.000014, inputCacheRead: 1.75e-7, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-5.1",
    category: "chat",
    pricing: { prompt: 0.00000125, completion: 0.00001, inputCacheRead: 1.25e-7, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-5",
    category: "chat",
    pricing: { prompt: 0.00000125, completion: 0.00001, inputCacheRead: 1.25e-7, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-5-mini",
    category: "chat",
    pricing: { prompt: 2.5e-7, completion: 0.000002, inputCacheRead: 2.5e-8, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-5-nano",
    category: "chat",
    pricing: { prompt: 5e-8, completion: 4e-7, inputCacheRead: 5e-9, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-4.1",
    category: "chat",
    pricing: { prompt: 0.000002, completion: 0.000008, inputCacheRead: 5e-7, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-4.1-mini",
    category: "chat",
    pricing: { prompt: 4e-7, completion: 0.0000016, inputCacheRead: 1e-7, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-4.1-nano",
    category: "chat",
    pricing: { prompt: 1e-7, completion: 4e-7, inputCacheRead: 2.5e-8, webSearch: 0.01 },
  },
  {
    id: "openai/gpt-4o",
    category: "chat",
    pricing: { prompt: 0.0000025, completion: 0.00001, inputCacheRead: 0.00000125 },
  },
  {
    id: "openai/gpt-4o-mini",
    category: "chat",
    pricing: { prompt: 1.5e-7, completion: 6e-7, inputCacheRead: 7.5e-8 },
  },
  {
    id: "openai/o3",
    category: "reasoning",
    pricing: { prompt: 0.000002, completion: 0.000008, inputCacheRead: 5e-7, webSearch: 0.01 },
  },
  {
    id: "openai/o3-mini",
    category: "reasoning",
    pricing: { prompt: 0.0000011, completion: 0.0000044, inputCacheRead: 5.5e-7 },
  },
  {
    id: "openai/o4-mini",
    category: "reasoning",
    pricing: { prompt: 0.0000011, completion: 0.0000044, inputCacheRead: 2.75e-7, webSearch: 0.01 },
  },
] as const;
