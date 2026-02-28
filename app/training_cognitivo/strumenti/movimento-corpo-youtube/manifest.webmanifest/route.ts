import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'Movimento Corpo YouTube - Training Cognitivo',
    short_name: 'Corpo YouTube',
    description: 'Controlla video YouTube con il movimento del corpo',
    start_url: '/training_cognitivo/strumenti/movimento-corpo-youtube',
    display: 'standalone',
    background_color: '#eff6ff',
    theme_color: '#1e40af',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } })
}
