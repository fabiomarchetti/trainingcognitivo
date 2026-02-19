import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Ascolto la Musica - TrainingCognitivo',
  description: 'Strumento per gestire e ascoltare brani musicali da YouTube',
  manifest: '/training_cognitivo/strumenti/ascolto-la-musica/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ascolto la Musica',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function AscoltoLaMusicaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
