/**
 * Layout per l'esercizio Numeri e Lettere
 */
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Numeri e Lettere | Training Cognitivo',
  description: 'Esercizio di pregrafismo per tracciare numeri e lettere',
  manifest: '/training_cognitivo/pregrafismo/numeri-e-lettere/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Numeri e Lettere',
  },
}

export const viewport: Viewport = {
  themeColor: '#9333ea',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function NumeriELettereLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
