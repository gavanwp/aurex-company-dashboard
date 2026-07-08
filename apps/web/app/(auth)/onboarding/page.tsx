import type { Metadata } from 'next'
import { OnboardingForm } from '@/modules/shared/components/onboarding-form'

export const metadata: Metadata = { title: 'Create your workspace' }

// Auth-required (middleware) but outside the (os) group — the user has no
// workspace yet, so the OS shell cannot render.
export default function OnboardingPage() {
  return <OnboardingForm />
}
