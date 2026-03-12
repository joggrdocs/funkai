import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { flattenPartials } from '@/lib/flatten.js'

const PARTIALS_DIR = resolve(import.meta.dirname, '../../../../prompts/src/prompts')

describe('flattenPartials', () => {
  describe('param parsing', () => {
    it('resolves a single literal param', () => {
      const template = "{% render 'identity', role: 'Bot' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('<identity>')
      expect(result).toContain('You are Bot, .')
      expect(result).not.toContain('{% render')
    })

    it('resolves multiple literal params', () => {
      const template = "{% render 'identity', role: 'TestBot', desc: 'a test agent' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are TestBot, a test agent.')
    })

    it('accepts an empty string as a valid literal param value', () => {
      const template = "{% render 'identity', role: '', desc: 'helper' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are , helper.')
      expect(result).not.toContain('{% render')
    })

    it('throws when the first param uses a variable reference', () => {
      const template = "{% render 'identity', role: agentRole, desc: 'helper' %}"

      expect(() => flattenPartials(template, [PARTIALS_DIR])).toThrow(
        'parameter "role" uses a variable reference'
      )
    })

    it('throws when a non-first param uses a variable reference', () => {
      const template = "{% render 'identity', role: 'Bot', desc: myDesc %}"

      expect(() => flattenPartials(template, [PARTIALS_DIR])).toThrow(
        'parameter "desc" uses a variable reference'
      )
    })

    it('throws when all params are variable references', () => {
      const template = "{% render 'identity', role: agentRole, desc: agentDesc %}"

      expect(() => flattenPartials(template, [PARTIALS_DIR])).toThrow('uses a variable reference')
    })

    it('handles extra whitespace around colons in params', () => {
      const template = "{% render 'identity', role  :  'Bot', desc  :  'helper' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Bot, helper.')
    })

    it('handles param values containing spaces', () => {
      const template = "{% render 'identity', role: 'Test Bot', desc: 'a helpful assistant' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Test Bot, a helpful assistant.')
    })
  })

  describe('render tag parsing', () => {
    it('returns template unchanged when no render tags exist', () => {
      const template = '<identity>\nYou are a bot.\n</identity>'
      expect(flattenPartials(template, [PARTIALS_DIR])).toBe(template)
    })

    it('parses a render tag with no params', () => {
      const template = "{% render 'identity' %}\n\nDone."
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('<identity>')
      expect(result).toContain('</identity>')
      expect(result).not.toContain('{% render')
    })

    it('parses left-only whitespace trim {%-', () => {
      const template = "{%- render 'identity', role: 'Bot', desc: 'helper' %}\nDone."
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Bot, helper.')
      expect(result).not.toContain('{%-')
    })

    it('parses right-only whitespace trim -%}', () => {
      const template = "{% render 'identity', role: 'Bot', desc: 'helper' -%}\nDone."
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Bot, helper.')
      expect(result).not.toContain('-%}')
    })

    it('parses both-side whitespace trim {%- -%}', () => {
      const template = "{%- render 'identity', role: 'Bot', desc: 'helper' -%}\nDone."
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Bot, helper.')
      expect(result).not.toContain('{%')
    })

    it('handles extra whitespace between {% and render keyword', () => {
      const template = "{%    render 'identity', role: 'Bot', desc: 'helper' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Bot, helper.')
    })

    it('does not match render tags with double quotes', () => {
      const template = '{% render "identity" %}'
      expect(flattenPartials(template, [PARTIALS_DIR])).toBe(template)
    })

    it('does not match malformed render tags without closing %}', () => {
      const template = "{% render 'identity'"
      expect(flattenPartials(template, [PARTIALS_DIR])).toBe(template)
    })
  })

  describe('integration with real partials', () => {
    it('flattens identity partial with literal params', () => {
      const template =
        "{% render 'identity', role: 'TestBot', desc: 'a test agent' %}\n\nFollow instructions."
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('<identity>')
      expect(result).toContain('You are TestBot, a test agent.')
      expect(result).toContain('</identity>')
      expect(result).toContain('Follow instructions.')
      expect(result).not.toContain('{% render')
    })

    it('flattens constraints partial with no bindings', () => {
      const template = "{% render 'constraints' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('<constraints>')
      expect(result).toContain('</constraints>')
      expect(result).not.toContain('## In Scope')
      expect(result).not.toContain('## Out of Scope')
      expect(result).not.toContain('## Rules')
      expect(result).not.toContain('{% render')
    })

    it('flattens tools partial with no bindings (else branch)', () => {
      const template = "{% render 'tools' %}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('<tools>')
      expect(result).toContain('</tools>')
      expect(result).toContain('No tools are configured for this agent.')
      expect(result).not.toContain('{% render')
    })

    it('flattens multiple render tags in one template', () => {
      const template = [
        "{% render 'identity', role: 'Bot', desc: 'helper' %}",
        '',
        "{% render 'identity', role: 'Agent', desc: 'analyzer' %}",
      ].join('\n')

      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('You are Bot, helper.')
      expect(result).toContain('You are Agent, analyzer.')
      expect(result).not.toContain('{% render')
    })

    it('preserves surrounding markdown content', () => {
      const template =
        "# System Prompt\n\n{% render 'identity', role: 'Bot', desc: 'helper' %}\n\n## Instructions\n\nDo the thing."
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toMatch(/^# System Prompt/)
      expect(result).toContain('You are Bot, helper.')
      expect(result).toContain('## Instructions\n\nDo the thing.')
    })

    it('throws when partial file does not exist', () => {
      const template = "{% render 'nonexistent' %}"

      expect(() => flattenPartials(template, [PARTIALS_DIR])).toThrow()
    })

    it('searches multiple partialsDirs in order', () => {
      const emptyDir = resolve(import.meta.dirname)
      const template = "{% render 'identity', role: 'Bot', desc: 'test' %}"
      const result = flattenPartials(template, [emptyDir, PARTIALS_DIR])

      expect(result).toContain('You are Bot, test.')
    })
  })

  describe('template preservation', () => {
    it('preserves {{ var }} and {% if %} expressions', () => {
      const template = 'Hello {{ name }}.\n{% if context %}{{ context }}{% endif %}'
      expect(flattenPartials(template, [PARTIALS_DIR])).toBe(template)
    })

    it('flattens render tag while preserving surrounding Liquid blocks', () => {
      const template =
        "{% if show_identity %}\n{% render 'identity', role: 'Bot', desc: 'helper' %}\n{% endif %}\n\n{{ instructions }}"
      const result = flattenPartials(template, [PARTIALS_DIR])

      expect(result).toContain('{% if show_identity %}')
      expect(result).toContain('{% endif %}')
      expect(result).toContain('{{ instructions }}')
      expect(result).toContain('You are Bot, helper.')
      expect(result).not.toContain('{% render')
    })

    it('returns empty string unchanged', () => {
      expect(flattenPartials('', [PARTIALS_DIR])).toBe('')
    })

    it('returns whitespace-only template unchanged', () => {
      const ws = '   \n\n   '
      expect(flattenPartials(ws, [PARTIALS_DIR])).toBe(ws)
    })
  })
})
