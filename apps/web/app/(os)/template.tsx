'use client'

// Per-navigation entrance (ADR-0007). A template re-mounts on every route change,
// so wrapping the page content here gives each module a short fade-and-rise on
// load and on navigation. CSS-only (aurex-page-enter) — children stay RSC.
export default function OsTemplate({ children }: { children: React.ReactNode }) {
  return <div className="aurex-page-enter">{children}</div>
}
