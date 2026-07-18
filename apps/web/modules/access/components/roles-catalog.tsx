import { Lock, ShieldAlert } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Card, CardContent } from '@aurexos/ui/components/card'
import type { RoleCatalogRow } from '../queries/get-roles'

const SCOPE_LABELS: Record<string, string> = {
  platform: 'Platform',
  organization: 'Organization',
  workspace: 'Workspace',
  portal: 'Portal',
}

const SCOPE_ORDER = ['platform', 'organization', 'workspace', 'portal']

function RoleCard({ role }: { role: RoleCatalogRow }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
              {role.isAdministrative ? (
                <Badge variant="warning-soft" className="gap-1">
                  <ShieldAlert className="size-3" aria-hidden="true" />
                  Administrative
                </Badge>
              ) : null}
            </div>
            {role.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>
            ) : null}
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 gap-1"
            title="System roles are immutable templates"
          >
            <Lock className="size-3" aria-hidden="true" />
            System
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          {role.permissionCount} permission{role.permissionCount === 1 ? '' : 's'} ·{' '}
          {role.memberCount} member{role.memberCount === 1 ? '' : 's'} in this workspace
        </p>

        {role.groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {role.groups.map((g) => (
              <span
                key={g.module}
                className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                title={g.actions.join(', ')}
              >
                {g.module}
                <span className="ml-1 [font-variant-numeric:tabular-nums]">{g.actions.length}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No implicit permissions (allowlist only).</p>
        )}

        {role.groups.length > 0 ? (
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-[hsl(var(--accent-text))] marker:content-['']">
              View all permissions
            </summary>
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {role.groups.flatMap((g) =>
                g.actions.map((a) => (
                  <li key={`${g.module}.${a}`} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{g.module}</span>.{a}
                  </li>
                )),
              )}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function RolesCatalog({ roles }: { roles: RoleCatalogRow[] }) {
  const byScope = SCOPE_ORDER.map((scope) => ({
    scope,
    roles: roles.filter((r) => r.scope === scope),
  })).filter((s) => s.roles.length > 0)

  return (
    <div className="space-y-8">
      {byScope.map(({ scope, roles: scopeRoles }) => (
        <div key={scope} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {SCOPE_LABELS[scope] ?? scope}
            </h2>
            <Badge variant="secondary">{scopeRoles.length}</Badge>
          </div>
          <div className="aurex-reveal grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scopeRoles.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
