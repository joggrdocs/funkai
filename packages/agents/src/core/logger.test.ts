import { describe, expect, it, vi } from 'vitest'

import { createDefaultLogger } from '@/core/logger.js'

// ---------------------------------------------------------------------------
// createDefaultLogger
// ---------------------------------------------------------------------------

describe('createDefaultLogger', () => {
  it('returns a logger with all required methods', () => {
    const log = createDefaultLogger()
    expect(log.debug).toBeDefined()
    expect(log.info).toBeDefined()
    expect(log.warn).toBeDefined()
    expect(log.error).toBeDefined()
    expect(log.child).toBeDefined()
  })

  it('logs info with message-first signature', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const log = createDefaultLogger()

    log.info('hello world')

    expect(spy).toHaveBeenCalledWith({}, 'hello world')
    spy.mockRestore()
  })

  it('logs info with message and metadata', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const log = createDefaultLogger()

    log.info('request completed', { status: 200 })

    expect(spy).toHaveBeenCalledWith({ status: 200 }, 'request completed')
    spy.mockRestore()
  })

  it('logs info with object-first (pino) signature', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const log = createDefaultLogger()

    log.info({ requestId: 'abc' }, 'started')

    expect(spy).toHaveBeenCalledWith({ requestId: 'abc' }, 'started')
    spy.mockRestore()
  })

  it('logs debug messages to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const log = createDefaultLogger()

    log.debug('trace data')

    expect(spy).toHaveBeenCalledWith({}, 'trace data')
    spy.mockRestore()
  })

  it('logs warn messages to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const log = createDefaultLogger()

    log.warn('deprecation notice')

    expect(spy).toHaveBeenCalledWith({}, 'deprecation notice')
    spy.mockRestore()
  })

  it('logs error messages to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log = createDefaultLogger()

    log.error('fatal', { code: 500 })

    expect(spy).toHaveBeenCalledWith({ code: 500 }, 'fatal')
    spy.mockRestore()
  })

  it('creates initial bindings that appear in all log output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const log = createDefaultLogger({ service: 'api' })

    log.info('boot')

    expect(spy).toHaveBeenCalledWith({ service: 'api' }, 'boot')
    spy.mockRestore()
  })

  it('merges initial bindings with per-call metadata', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const log = createDefaultLogger({ service: 'api' })

    log.info('req', { path: '/health' })

    expect(spy).toHaveBeenCalledWith({ service: 'api', path: '/health' }, 'req')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// child loggers
// ---------------------------------------------------------------------------

describe('child loggers', () => {
  it('creates a child logger that inherits parent bindings', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const parent = createDefaultLogger({ service: 'api' })
    const child = parent.child({ workflow: 'deploy' })

    child.info('step started')

    expect(spy).toHaveBeenCalledWith({ service: 'api', workflow: 'deploy' }, 'step started')
    spy.mockRestore()
  })

  it('does not affect parent when child adds bindings', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const parent = createDefaultLogger({ service: 'api' })
    parent.child({ workflow: 'deploy' })

    parent.info('parent log')

    expect(spy).toHaveBeenCalledWith({ service: 'api' }, 'parent log')
    spy.mockRestore()
  })

  it('supports multiple levels of child nesting', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const root = createDefaultLogger({ app: 'serenity' })
    const mid = root.child({ workflow: 'build' })
    const leaf = mid.child({ step: 'compile' })

    leaf.info('compiling')

    expect(spy).toHaveBeenCalledWith(
      { app: 'serenity', workflow: 'build', step: 'compile' },
      'compiling'
    )
    spy.mockRestore()
  })

  it('child bindings override parent bindings with same key', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const parent = createDefaultLogger({ scope: 'parent' })
    const child = parent.child({ scope: 'child' })

    child.info('scoped')

    expect(spy).toHaveBeenCalledWith({ scope: 'child' }, 'scoped')
    spy.mockRestore()
  })

  it('child logger has all level methods', () => {
    const parent = createDefaultLogger()
    const child = parent.child({ step: 'test' })

    expect(child.debug).toBeDefined()
    expect(child.info).toBeDefined()
    expect(child.warn).toBeDefined()
    expect(child.error).toBeDefined()
    expect(child.child).toBeDefined()
  })
})
