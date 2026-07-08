import type { Metadata } from 'next'
import { LoginForm } from '@/modules/shared/components/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return <LoginForm />
}
