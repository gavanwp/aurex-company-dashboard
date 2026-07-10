import type { Metadata } from 'next'
import { LoginForm } from '@/modules/shared/components/login-form'

export const metadata: Metadata = { title: 'Sign in' }

interface LoginPageProps {
  searchParams: Promise<{ error?: string; notice?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams

  return <LoginForm errorCode={error ?? null} notice={notice ?? null} />
}
