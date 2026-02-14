/**
 * Generatore Icone PWA
 *
 * Tool per generare icone PWA in tutte le dimensioni necessarie
 * e salvarle nella cartella dell'esercizio selezionato
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, Upload, Image as ImageIcon, Download,
  CheckCircle, XCircle, Loader2, FolderOpen, Trash2, Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Dimensioni icone PWA standard
const PWA_ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

interface Esercizio {
  id: number
  nome: string
  slug: string
  percorso_app: string | null
  categoria_nome?: string
}

export default function GeneraIconePage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Stato
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [selectedEsercizio, setSelectedEsercizio] = useState<Esercizio | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [generatedIcons, setGeneratedIcons] = useState<{ size: number; dataUrl: string }[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Carica esercizi dal database
  useEffect(() => {
    loadEsercizi()
  }, [])

  const loadEsercizi = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('esercizi')
        .select(`
          id,
          nome,
          slug,
          percorso_app,
          categorie_esercizi (nome)
        `)
        .order('nome')

      if (error) throw error

      const mapped = (data || []).map((e: any) => ({
        id: e.id,
        nome: e.nome,
        slug: e.slug,
        percorso_app: e.percorso_app,
        categoria_nome: e.categorie_esercizi?.nome || 'Senza categoria'
      }))

      setEsercizi(mapped)
    } catch (error) {
      console.error('Errore caricamento esercizi:', error)
    } finally {
      setLoading(false)
    }
  }

  // Gestione upload immagine
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verifica tipo file
    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine (PNG, JPG, SVG)')
      return
    }

    setUploadedFileName(file.name)
    setGeneratedIcons([])
    setSaveResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Genera icone in tutte le dimensioni
  const generateIcons = async () => {
    if (!uploadedImage) return

    setIsGenerating(true)
    setGeneratedIcons([])

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const icons: { size: number; dataUrl: string }[] = []

      PWA_ICON_SIZES.forEach(size => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        if (ctx) {
          // Sfondo trasparente
          ctx.clearRect(0, 0, size, size)

          // Calcola dimensioni per mantenere aspect ratio e centrare
          const scale = Math.min(size / img.width, size / img.height)
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          const x = (size - scaledWidth) / 2
          const y = (size - scaledHeight) / 2

          // Disegna immagine ridimensionata
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

          icons.push({
            size,
            dataUrl: canvas.toDataURL('image/png')
          })
        }
      })

      setGeneratedIcons(icons)
      setIsGenerating(false)
    }

    img.onerror = () => {
      alert('Errore nel caricamento dell\'immagine')
      setIsGenerating(false)
    }

    img.src = uploadedImage
  }

  // Salva icone nella cartella dell'esercizio
  const saveIcons = async () => {
    if (!selectedEsercizio || generatedIcons.length === 0) {
      alert('Seleziona un esercizio e genera le icone prima di salvare')
      return
    }

    if (!selectedEsercizio.percorso_app) {
      alert('L\'esercizio selezionato non ha un percorso cartella configurato. Aggiornalo nel database.')
      return
    }

    setIsSaving(true)
    setSaveResult(null)

    try {
      const response = await fetch('/api/tools/genera-icone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          esercizio_id: selectedEsercizio.id,
          percorso_app: selectedEsercizio.percorso_app,
          icons: generatedIcons.map(icon => ({
            size: icon.size,
            dataUrl: icon.dataUrl
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        setSaveResult({ success: true, message: `Icone salvate in ${selectedEsercizio.percorso_app}/icons/` })
      } else {
        setSaveResult({ success: false, message: data.message || 'Errore nel salvataggio' })
      }
    } catch (error) {
      setSaveResult({ success: false, message: 'Errore di connessione' })
    } finally {
      setIsSaving(false)
    }
  }

  // Download singola icona
  const downloadIcon = (icon: { size: number; dataUrl: string }) => {
    const link = document.createElement('a')
    link.download = `icon-${icon.size}x${icon.size}.png`
    link.href = icon.dataUrl
    link.click()
  }

  // Download tutte le icone come ZIP (semplificato: download singoli)
  const downloadAll = () => {
    generatedIcons.forEach((icon, index) => {
      setTimeout(() => downloadIcon(icon), index * 200)
    })
  }

  // Reset
  const resetAll = () => {
    setUploadedImage(null)
    setUploadedFileName('')
    setGeneratedIcons([])
    setSaveResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Torna all'admin"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a
              href="/"
              className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors"
              title="Torna alla Home"
            >
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            Generatore Icone PWA
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Info Box */}
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-indigo-500">
          <p className="text-gray-700">
            <strong>Come funziona:</strong> Carica un'immagine (preferibilmente quadrata, minimo 512x512px),
            genera le icone in tutte le dimensioni PWA, seleziona l'esercizio di destinazione e salva.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Colonna Sinistra: Upload e Selezione */}
          <div className="space-y-6">

            {/* Upload Immagine */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5" />
                1. Carica Immagine
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  uploadedImage
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                {uploadedImage ? (
                  <div className="space-y-4">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-green-700 font-medium">{uploadedFileName}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetAll(); }}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1 mx-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Rimuovi
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600">Clicca per selezionare un'immagine</p>
                    <p className="text-sm text-gray-400">PNG, JPG, SVG - min 512x512px consigliato</p>
                  </div>
                )}
              </div>

              {uploadedImage && (
                <button
                  onClick={generateIcons}
                  disabled={isGenerating}
                  className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      Genera Icone ({PWA_ICON_SIZES.length} dimensioni)
                    </>
                  )}
                </button>
              )}
            </section>

            {/* Selezione Esercizio */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                2. Seleziona Esercizio
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <>
                  <select
                    value={selectedEsercizio?.id || ''}
                    onChange={(e) => {
                      const es = esercizi.find(ex => ex.id === parseInt(e.target.value))
                      setSelectedEsercizio(es || null)
                      setSaveResult(null)
                    }}
                    className="w-full p-3 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Seleziona un esercizio --</option>
                    {esercizi.map(es => (
                      <option key={es.id} value={es.id}>
                        [{es.categoria_nome}] {es.nome}
                      </option>
                    ))}
                  </select>

                  {selectedEsercizio && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Percorso cartella:</strong>
                      </p>
                      <p className={`font-mono text-sm ${selectedEsercizio.percorso_app ? 'text-green-700' : 'text-red-600'}`}>
                        {selectedEsercizio.percorso_app || '⚠️ Non configurato - aggiorna il database'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Pulsante Salva */}
            {generatedIcons.length > 0 && selectedEsercizio && (
              <section className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  3. Salva Icone
                </h2>

                <button
                  onClick={saveIcons}
                  disabled={isSaving || !selectedEsercizio.percorso_app}
                  className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Salvataggio in corso...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Salva nella cartella esercizio
                    </>
                  )}
                </button>

                {saveResult && (
                  <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
                    saveResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {saveResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    {saveResult.message}
                  </div>
                )}

                <button
                  onClick={downloadAll}
                  className="mt-3 w-full py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Scarica tutte sul PC
                </button>
              </section>
            )}
          </div>

          {/* Colonna Destra: Preview Icone */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Icone Generate
            </h2>

            {generatedIcons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
                <p>Carica un'immagine e clicca "Genera Icone"</p>
                <p className="text-sm">per vedere l'anteprima</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {generatedIcons.map(icon => (
                  <div
                    key={icon.size}
                    className="border rounded-lg p-2 text-center hover:border-indigo-400 transition-colors group cursor-pointer"
                    onClick={() => downloadIcon(icon)}
                    title="Clicca per scaricare"
                  >
                    <div className="bg-gray-100 rounded-lg p-2 mb-2 flex items-center justify-center" style={{ minHeight: '80px' }}>
                      <img
                        src={icon.dataUrl}
                        alt={`Icon ${icon.size}x${icon.size}`}
                        style={{ maxWidth: Math.min(icon.size, 64), maxHeight: Math.min(icon.size, 64) }}
                        className="rounded"
                      />
                    </div>
                    <p className="text-xs font-mono text-gray-600">{icon.size}x{icon.size}</p>
                    <Download className="h-4 w-4 mx-auto mt-1 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                ))}
              </div>
            )}

            {/* Dimensioni generate */}
            {generatedIcons.length > 0 && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700">
                  <strong>Dimensioni generate:</strong> {PWA_ICON_SIZES.join('px, ')}px
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  Queste sono le dimensioni standard per le Progressive Web App
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Canvas nascosto per elaborazione */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
