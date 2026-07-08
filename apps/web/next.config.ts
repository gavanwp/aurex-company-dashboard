import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aurexos/ui', '@aurexos/core', '@aurexos/db'],
}

export default nextConfig
