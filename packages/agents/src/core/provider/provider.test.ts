import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the external provider before importing the module under test
const mockBaseCreateOpenRouter = vi.fn()
const mockProviderInstance = vi.fn()

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: mockBaseCreateOpenRouter,
}))

// Must import after mocking
const { createOpenRouter, openrouter } = await import('@/core/provider/provider.js')

// ---------------------------------------------------------------------------
// createOpenRouter()
// ---------------------------------------------------------------------------

describe('createOpenRouter()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBaseCreateOpenRouter.mockReturnValue(mockProviderInstance)
    vi.stubEnv('OPENROUTER_API_KEY', 'env-key-123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses explicit apiKey when provided in options', () => {
    createOpenRouter({ apiKey: 'explicit-key' })

    expect(mockBaseCreateOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'explicit-key' })
    )
  })

  it('falls back to OPENROUTER_API_KEY env var when no apiKey in options', () => {
    createOpenRouter()

    expect(mockBaseCreateOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'env-key-123' })
    )
  })

  it('falls back to env var when options are provided without apiKey', () => {
    createOpenRouter({})

    expect(mockBaseCreateOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'env-key-123' })
    )
  })

  it('throws when no apiKey provided and env var is not set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', undefined as unknown as string)

    expect(() => createOpenRouter()).toThrow('OPENROUTER_API_KEY environment variable is required')
  })

  it('forwards additional options to the base provider', () => {
    createOpenRouter({ apiKey: 'key', baseURL: 'https://custom.api' } as Record<string, unknown>)

    expect(mockBaseCreateOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'key',
        baseURL: 'https://custom.api',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// openrouter() — cached model factory
// ---------------------------------------------------------------------------

// Each test in this block uses a unique API key to invalidate the module-level
// cache, so call-count assertions remain isolated between tests.

describe('openrouter()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProviderInstance.mockReturnValue({ modelId: 'mock-model' })
    mockBaseCreateOpenRouter.mockReturnValue(mockProviderInstance)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates a provider and returns a language model', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'key-test-create')

    const result = openrouter('openai/gpt-5.2-codex')

    expect(mockBaseCreateOpenRouter).toHaveBeenCalledWith({ apiKey: 'key-test-create' })
    expect(mockProviderInstance).toHaveBeenCalledWith('openai/gpt-5.2-codex')
    expect(result).toEqual({ modelId: 'mock-model' })
  })

  it('reuses cached provider on subsequent calls with same api key', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'key-test-reuse')

    openrouter('openai/gpt-5.2-codex')
    openrouter('openai/gpt-5.2')

    // Provider should only be created once since key is the same
    expect(mockBaseCreateOpenRouter).toHaveBeenCalledTimes(1)
    expect(mockProviderInstance).toHaveBeenCalledTimes(2)
  })

  it('creates new provider when api key changes', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'key-test-change-1')
    openrouter('openai/gpt-5.2-codex')

    vi.stubEnv('OPENROUTER_API_KEY', 'key-test-change-2')
    openrouter('openai/gpt-5.2')

    expect(mockBaseCreateOpenRouter).toHaveBeenCalledTimes(2)
    expect(mockBaseCreateOpenRouter).toHaveBeenLastCalledWith({ apiKey: 'key-test-change-2' })
  })

  it('throws when OPENROUTER_API_KEY is not set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', undefined as unknown as string)

    expect(() => openrouter('openai/gpt-5.2-codex')).toThrow(
      'OPENROUTER_API_KEY environment variable is required'
    )
  })
})
