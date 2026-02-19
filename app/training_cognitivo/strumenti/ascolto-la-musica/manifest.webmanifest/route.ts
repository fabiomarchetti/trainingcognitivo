import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: 'Ascolto la Musica - TrainingCognitivo',
    short_name: 'Ascolto Musica',
    description: 'Strumento per gestire e ascoltare brani musicali da YouTube',
    start_url: '/training_cognitivo/strumenti/ascolto-la-musica',
    scope: '/training_cognitivo/strumenti/ascolto-la-musica',
    display: 'standalone',
    background_color: '#7c3aed',
    theme_color: '#7c3aed',
    orientation: 'any',
    categories: ['education', 'music'],
    lang: 'it',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  })
}
