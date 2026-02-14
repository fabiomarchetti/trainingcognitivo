/**
 * Route handler per il manifest PWA dell'esercizio Parola-Immagine
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: "Parola-Immagine",
    short_name: "Parola-Img",
    description: "Esercizio di associazione parola-immagine per training cognitivo",
    start_url: "/training_cognitivo/leggo-scrivo/parola-immagine",
    display: "standalone",
    background_color: "#ECFDF5",
    theme_color: "#059669",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    categories: ["education", "games"],
    lang: "it-IT"
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  })
}
