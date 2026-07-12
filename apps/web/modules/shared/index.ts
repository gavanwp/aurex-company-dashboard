// Public surface of modules/shared — the ONLY file other code may import
// from this module (13_Folder_Structure.md §3). Cross-module glue only.

// This barrel is CLIENT-SAFE: it is imported by client components (e.g.
// modules/settings → Security), so it must never re-export a `server-only`
// module. The shell notifications query is server-only and lives in its own
// server entry point (./server) that only server code imports.
export { AppShell } from './components/app-shell'
export type { AppShellProps, AppShellWorkspace } from './components/app-shell'
export { CommandPalette } from './components/command-palette'
export { ThemeProvider } from './components/theme-provider'
// Auth actions other modules compose (settings → Security).
export { changePassword, logoutEverywhere } from './actions/auth'
// Auth surfaces composed by the (auth) route group (R-A1: routes import
// the public surface, never module internals).
export { LoginForm } from './components/login-form'
export { SignupForm } from './components/signup-form'
export { OnboardingForm } from './components/onboarding-form'
export { ForgotPasswordForm } from './components/forgot-password-form'
export { ResetPasswordForm } from './components/reset-password-form'
