import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import '@aurexos/ui/styles/globals.css'
import { Toaster } from '@aurexos/ui/components/sonner'
import { ThemeProvider } from '@/modules/shared'

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: {
    default: 'AurexOS — The AI Operating System for Digital Agencies',
    template: '%s · AurexOS',
  },
  description: 'The AI Operating System for Digital Agencies.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
