import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: 'Comunicatore CAA',
    short_name: 'Comunicatore',
    description: 'Sistema di Comunicazione Aumentativa Alternativa con pittogrammi',
    start_url: '/training_cognitivo/strumenti/comunicatore',
    scope: '/training_cognitivo/strumenti/comunicatore',
    display: 'standalone',
    background_color: '#F5F3FF',
    theme_color: '#7C3AED',
    orientation: 'any',
    icons: [
      {
        src: '/training_cognitivo/strumenti/comunicatore/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/training_cognitivo/strumenti/comunicatore/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    categories: ['education', 'accessibility'],
    lang: 'it-IT',
    dir: 'ltr'
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  })
}
