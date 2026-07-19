import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aurexos/ui', '@aurexos/core', '@aurexos/db'],
  // Ship a quieter, slightly smaller production bundle — drop debug logging but
  // keep the best-effort error/warn logs the mutation spine relies on.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
}

export default nextConfig
