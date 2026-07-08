export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          A
        </div>
        <span className="text-xl font-semibold tracking-tight text-foreground">AurexOS</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
