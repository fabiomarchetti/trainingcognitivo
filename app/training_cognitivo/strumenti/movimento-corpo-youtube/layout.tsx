import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Movimento Corpo YouTube | Training Cognitivo',
  description: 'Controlla video YouTube con il movimento del corpo: bocca, testa e mano',
  manifest: '/training_cognitivo/strumenti/movimento-corpo-youtube/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Movimento Corpo',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
