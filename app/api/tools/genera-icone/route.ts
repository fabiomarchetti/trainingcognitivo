/**
 * API per salvare le icone PWA nella cartella dell'esercizio
 */
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { esercizio_id, percorso_app, icons } = body

    if (!percorso_app || !icons || icons.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Parametri mancanti: percorso_app e icons sono obbligatori'
      }, { status: 400 })
    }

    // Costruisci percorso assoluto della cartella icons
    const projectRoot = process.cwd()
    const iconsDir = path.join(projectRoot, percorso_app, 'icons')

    // Crea cartella se non esiste
    if (!existsSync(iconsDir)) {
      await mkdir(iconsDir, { recursive: true })
      console.log(`[Icone] Creata cartella: ${iconsDir}`)
    }

    const savedFiles: string[] = []

    // Salva ogni icona
    for (const icon of icons) {
      const { size, dataUrl } = icon

      // Estrai dati base64 dall'URL data
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      // Nome file
      const fileName = `icon-${size}x${size}.png`
      const filePath = path.join(iconsDir, fileName)

      // Scrivi file
      await writeFile(filePath, buffer)
      savedFiles.push(fileName)
      console.log(`[Icone] Salvata: ${filePath}`)
    }

    // Crea anche un file icon.svg come copia della 512x512 per fallback
    // (opzionale, commenta se non serve)

    return NextResponse.json({
      success: true,
      message: `Salvate ${savedFiles.length} icone`,
      data: {
        directory: iconsDir,
        files: savedFiles
      }
    })

  } catch (error: any) {
    console.error('[Icone] Errore:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Errore durante il salvataggio delle icone'
    }, { status: 500 })
  }
}

// GET per verificare che l'API funzioni
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API Genera Icone PWA attiva',
    sizes: [72, 96, 128, 144, 152, 192, 384, 512]
  })
}
