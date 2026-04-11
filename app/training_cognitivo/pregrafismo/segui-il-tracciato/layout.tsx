/**
 * Layout per l'esercizio Segui il Tracciato
 */
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Segui il Tracciato | Training Cognitivo',
  description: 'Esercizio di pregrafismo: traccia il percorso dall\'oggetto al target',
  manifest: '/training_cognitivo/pregrafismo/segui-il-tracciato/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Segui il Tracciato',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function SeguiTracciatoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
