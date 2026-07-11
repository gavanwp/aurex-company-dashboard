// Public surface of modules/shared — the ONLY file other code may import
// from this module (13_Folder_Structure.md §3). Cross-module glue only.

export { AppShell } from './components/app-shell'
export type { AppShellProps, AppShellWorkspace } from './components/app-shell'
export { CommandPalette } from './components/command-palette'
export { ThemeProvider } from './components/theme-provider'
export { getShellNotifications } from './queries/get-notifications'
export type { ShellNotification, ShellNotifications } from './queries/get-notifications'
// Auth actions other modules compose (settings → Security).
export { changePassword, logoutEverywhere } from './actions/auth'
// Auth surfaces composed by the (auth) route group (R-A1: routes import
// the public surface, never module internals).
export { LoginForm } from './components/login-form'
export { SignupForm } from './components/signup-form'
export { OnboardingForm } from './components/onboarding-form'
export { ForgotPasswordForm } from './components/forgot-password-form'
export { ResetPasswordForm } from './components/reset-password-form'
