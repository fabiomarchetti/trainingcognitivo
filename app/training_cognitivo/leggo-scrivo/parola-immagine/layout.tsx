/**
 * Layout per l'esercizio Parola-Immagine
 * Aggiunge il manifest PWA specifico per questo esercizio
 */
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Parola-Immagine | Training Cognitivo',
  description: 'Esercizio di associazione parola-immagine per training cognitivo',
  manifest: '/training_cognitivo/leggo-scrivo/parola-immagine/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Parola-Immagine',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ParolaImmagineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
