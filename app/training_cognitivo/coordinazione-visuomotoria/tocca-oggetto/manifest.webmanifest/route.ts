import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: 'Tocca Oggetto - Training Cognitivo',
    short_name: 'Tocca Oggetto',
    description: 'Coordinazione visuomotoria: tocca i target che si muovono',
    start_url: '/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto',
    display: 'standalone',
    background_color: '#f5f3ff',
    theme_color: '#7c3aed',
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
