/**
 * Layout per l'esercizio Cerca Categoria
 * Aggiunge il manifest PWA specifico per questo esercizio
 */
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Cerca Categoria | Training Cognitivo',
  description: 'Esercizio di categorizzazione: trova le immagini che appartengono alla categoria',
  manifest: '/training_cognitivo/categorizzazione/cerca-categoria/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cerca Categoria',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function CercaCategoriaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
