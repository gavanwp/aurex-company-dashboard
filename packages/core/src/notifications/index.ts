// Notification engine contracts — NotificationsArchitecture.md + ADR-0004.
// Pure contracts only; the pipeline runtime lives in supabase/functions
// workers on the jobs substrate (ADR-0005).

export * from './types'
export * from './channel-adapter'
export * from './render'
