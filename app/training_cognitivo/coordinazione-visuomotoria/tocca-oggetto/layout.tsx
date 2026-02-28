import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Tocca Oggetto | Training Cognitivo',
  description: 'Esercizio di coordinazione visuomotoria: tocca gli oggetti target che si muovono sullo schermo',
  manifest: '/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tocca Oggetto',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ToccaOggettoLayout({ children }: { children: React.ReactNode }) {
  return children
}
