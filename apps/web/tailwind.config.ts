import type { Config } from 'tailwindcss'
import preset from '@aurexos/config/tailwind/preset'

const config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/components/**/*.{ts,tsx}',
  ],
} satisfies Config

export default config
