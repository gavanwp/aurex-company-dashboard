import { redirect } from 'next/navigation'

// Middleware guarantees auth by the time this renders; the OS home is the dashboard.
export default function RootPage() {
  redirect('/dashboard')
}
