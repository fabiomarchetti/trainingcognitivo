/**
 * Root Layout - TrainingCognitivo
 * Layout principale con metadata e providers
 */
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TrainingCognitivo',
    template: '%s | TrainingCognitivo',
  },
  description: 'Sistema di Training Cognitivo per utenti con difficoltà cognitive e sensoriali',
  keywords: ['training cognitivo', 'assistive technology', 'educazione speciale', 'esercizi cognitivi'],
  authors: [{ name: 'AssistiveTech.it' }],
  creator: 'AssistiveTech.it',
  publisher: 'AssistiveTech.it',
  applicationName: 'TrainingCognitivo',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TrainingCognitivo',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  )
}
