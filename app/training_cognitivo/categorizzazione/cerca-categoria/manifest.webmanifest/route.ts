/**
 * Manifest dinamico PWA per Cerca Categoria
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: 'Cerca Categoria - Training Cognitivo',
    short_name: 'Cerca Cat.',
    description: 'Esercizio di categorizzazione: trova le immagini della categoria',
    start_url: '/training_cognitivo/categorizzazione/cerca-categoria',
    display: 'standalone',
    background_color: '#f0fdfa',
    theme_color: '#0d9488',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
