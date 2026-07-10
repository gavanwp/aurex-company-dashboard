import { describe, expect, it } from 'vitest'
import type { Capability, WorkspaceRole } from '../types/index'
import { WORKSPACE_ROLES } from '../types/index'
import { MEMBER_MANAGER_ROLES, can, capabilitiesFor } from './index'

// R-Q2: permission logic is business logic — the RBAC map is the app-layer half
// of the tenancy defense (RLS is the DB half); both get adversarial coverage (R-S7).

describe('can()', () => {
  it('grants owner and admin full workspace management', () => {
    expect(can('owner', 'workspace.manage')).toBe(true)
    expect(can('owner', 'workspace.members.manage')).toBe(true)
    expect(can('admin', 'workspace.manage')).toBe(true)
    expect(can('admin', 'workspace.members.manage')).toBe(true)
  })

  it('denies workspace management to every non-admin role (adversarial sweep)', () => {
    const nonManagers = WORKSPACE_ROLES.filter((r) => r !== 'owner' && r !== 'admin')
    for (const role of nonManagers) {
      expect(can(role, 'workspace.manage'), `${role} must not manage workspace`).toBe(false)
      expect(can(role, 'workspace.members.manage'), `${role} must not manage members`).toBe(false)
    }
  })

  it('allows a member to work on projects and tasks but never delete them', () => {
    expect(can('member', 'projects.create')).toBe(true)
    expect(can('member', 'tasks.edit')).toBe(true)
    expect(can('member', 'projects.delete')).toBe(false)
    expect(can('member', 'tasks.delete')).toBe(false)
  })

  it('scopes sales to CRM ownership without project mutation rights', () => {
    expect(can('sales', 'crm.create')).toBe(true)
    expect(can('sales', 'crm.delete')).toBe(true)
    expect(can('sales', 'projects.create')).toBe(false)
    expect(can('sales', 'projects.delete')).toBe(false)
  })

  it('keeps finance read-only across modules', () => {
    expect(can('finance', 'projects.view')).toBe(true)
    expect(can('finance', 'crm.view')).toBe(true)
    for (const cap of [
      'projects.create',
      'tasks.create',
      'crm.create',
      'clients.create',
    ] as const) {
      expect(can('finance', cap), `finance must not hold ${cap}`).toBe(false)
    }
  })

  it('confines client and guest to read-only viewing surfaces', () => {
    for (const role of ['client', 'guest'] as const) {
      expect(can(role, 'projects.view')).toBe(true)
      expect(can(role, 'tasks.view')).toBe(true)
      // No mutation capability of any kind — the portal is a read slice.
      const mutations = capabilitiesFor(role).filter((cap) =>
        /\.(create|edit|delete|manage)$/.test(cap),
      )
      expect(mutations).toEqual([])
      // Not even workspace settings.
      expect(can(role, 'settings.view')).toBe(false)
    }
  })

  it('fails closed on capabilities that are not in the map', () => {
    // A typo'd or future capability must deny, not throw or grant.
    const unknownCapabilities: string[] = ['finance.manage', '', 'projects.view ']
    for (const cap of unknownCapabilities) {
      expect(can('owner', cap as Capability), `"${cap}" must fail closed`).toBe(false)
      expect(can('member', cap as Capability), `"${cap}" must fail closed`).toBe(false)
    }
  })
})

describe('capabilitiesFor()', () => {
  it('is defined and non-empty for every workspace role', () => {
    for (const role of WORKSPACE_ROLES) {
      expect(capabilitiesFor(role).length, `${role} must map to capabilities`).toBeGreaterThan(0)
    }
  })

  it('agrees with can() for every role/capability pair', () => {
    for (const role of WORKSPACE_ROLES) {
      for (const cap of capabilitiesFor(role)) {
        expect(can(role, cap)).toBe(true)
      }
    }
  })

  it('only emits module-prefixed capability names', () => {
    for (const role of WORKSPACE_ROLES) {
      for (const cap of capabilitiesFor(role)) {
        expect(cap).toMatch(/^[a-z]+(?:\.[a-z]+){1,2}$/)
      }
    }
  })
})

describe('MEMBER_MANAGER_ROLES', () => {
  it('is exactly the set of roles that can manage members', () => {
    const managersViaCan: WorkspaceRole[] = WORKSPACE_ROLES.filter((role) =>
      can(role, 'workspace.members.manage'),
    )
    expect([...MEMBER_MANAGER_ROLES].sort()).toEqual([...managersViaCan].sort())
    expect(MEMBER_MANAGER_ROLES).toEqual(['owner', 'admin'])
  })
})
