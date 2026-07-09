import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { aurexSystemFrameV1 } from './aurex-system-frame'
import { getPrompt, requirePrompt } from './registry'

const validVars = {
  workspaceName: 'Acme Studio',
  userDisplayName: 'Priya N.',
  userRole: 'project_manager',
  todayIso: '2026-07-08',
}

describe('aurex.system_frame v1', () => {
  it('renders validated variables into the frame', () => {
    const rendered = aurexSystemFrameV1.render(validVars)

    expect(rendered).toContain('You are Aurex')
    expect(rendered).toContain('Name: Acme Studio')
    expect(rendered).toContain('Priya N. (role: project_manager)')
    // Volatile values render last for prompt-cache prefix stability (07_AI_Strategy §9).
    expect(rendered.trimEnd().endsWith("Today's date: 2026-07-08")).toBe(true)
  })

  it('rejects missing variables instead of rendering a half-filled prompt (R-T3)', () => {
    expect(() => aurexSystemFrameV1.render({ workspaceName: 'Acme Studio' })).toThrow(ZodError)
  })

  it('rejects malformed variable values', () => {
    expect(() => aurexSystemFrameV1.render({ ...validVars, todayIso: 'July 8th' })).toThrow(ZodError)
  })
})

describe('prompt registry', () => {
  it('resolves registered prompts by id with version pinned', () => {
    const prompt = requirePrompt('aurex.system_frame')

    expect(prompt.id).toBe('aurex.system_frame')
    expect(prompt.version).toBe(1)
    expect(prompt.tierHint).toBe('frontier')
  })

  it('returns undefined (getPrompt) and throws (requirePrompt) for unknown ids', () => {
    expect(getPrompt('aurex.does_not_exist')).toBeUndefined()
    expect(() => requirePrompt('aurex.does_not_exist')).toThrow(/unknown prompt id/)
  })
})
