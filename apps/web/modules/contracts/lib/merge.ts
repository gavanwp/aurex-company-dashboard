// Pure merge-field resolution for contract clause bodies. Zero I/O. Placeholders
// use a {{snake_case}} syntax; unknown placeholders are left untouched so a
// half-filled contract never renders a broken token to a client.

import { formatMoney } from '@aurexos/core'

export interface MergeContext {
  clientName?: string | null
  workspaceName?: string | null
  effectiveDate?: string | null
  endDate?: string | null
  valueMinor?: number | null
  currency?: string | null
}

function humanDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Resolve merge fields in a single string. Supported tokens:
 *   {{client_name}} {{workspace_name}} {{effective_date}} {{end_date}} {{value}}
 * Unknown tokens are preserved verbatim.
 */
export function mergeFields(input: string, ctx: MergeContext): string {
  const values: Record<string, string> = {
    client_name: ctx.clientName?.trim() || 'the Client',
    workspace_name: ctx.workspaceName?.trim() || 'the Provider',
    effective_date: humanDate(ctx.effectiveDate),
    end_date: humanDate(ctx.endDate),
    value: formatMoney(ctx.valueMinor ?? null, ctx.currency ?? 'USD'),
  }
  return input.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => values[key] ?? match)
}
