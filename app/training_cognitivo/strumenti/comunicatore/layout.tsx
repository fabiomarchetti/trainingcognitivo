import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comunicatore CAA - Training Cognitivo',
  description: 'Sistema di Comunicazione Aumentativa Alternativa con pittogrammi e sintesi vocale',
  manifest: '/training_cognitivo/strumenti/comunicatore/manifest.webmanifest',
  themeColor: '#7C3AED',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Comunicatore CAA',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/training_cognitivo/strumenti/comunicatore/icons/icon-192x192.png',
    apple: '/training_cognitivo/strumenti/comunicatore/icons/icon-192x192.png',
  },
}

export default function ComunicatoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
