// Public surface of modules/shared — the ONLY file other code may import
// from this module (13_Folder_Structure.md §3). Cross-module glue only.

export { AppShell } from './components/app-shell'
export type { AppShellProps, AppShellWorkspace } from './components/app-shell'
export { CommandPalette } from './components/command-palette'
export { ThemeProvider } from './components/theme-provider'
// Auth actions other modules compose (settings → Security).
export { changePassword, logoutEverywhere } from './actions/auth'
