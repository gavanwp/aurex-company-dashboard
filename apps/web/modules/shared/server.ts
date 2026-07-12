// Server-only public surface of modules/shared. Server consumers (the (os)
// layout) import shell data from here; it is kept OUT of ./index.ts because
// that barrel is imported by client components and must never pull in a
// `server-only` module (doing so 500s the whole client graph).
export { getShellNotifications } from './queries/get-notifications'
export type { ShellNotification, ShellNotifications } from './queries/get-notifications'
