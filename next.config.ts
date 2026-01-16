import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configurazione immagini
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.arasaac.org',
        pathname: '/api/pictograms/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },

  // Headers di sicurezza
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Redirect legacy URLs
  async redirects() {
    return [
      // Redirect da vecchi URL PHP se necessario
      // {
      //   source: '/login.html',
      //   destination: '/login',
      //   permanent: true,
      // },
    ]
  },
}

export default nextConfig
