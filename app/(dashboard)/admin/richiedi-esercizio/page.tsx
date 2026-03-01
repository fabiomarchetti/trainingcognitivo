/**
 * Pagina: Richiedi Esercizio
 * Educatori e insegnanti possono richiedere nuovi esercizi
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Target,
  FileText,
  Package,
  CheckCircle,
  BarChart3,
  Paperclip,
  Loader2,
  X,
  Upload,
  User
} from 'lucide-react'

interface Richiedente {
  id: string
  nome: string
  cognome: string
  ruolo: string
}

interface Allegato {
  nome: string
  url: string
  tipo: string
}

export default function RichiediEsercizioPage() {
  const [richiedenti, setRichiedenti] = useState<Richiedente[]>([])
  const [selectedRichiedente, setSelectedRichiedente] = useState<string>('')
  const [isLoadingRichiedenti, setIsLoadingRichiedenti] = useState(true)

  const [obiettivo, setObiettivo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [contenuti, setContenuti] = useState('')
  const [azioneUtente, setAzioneUtente] = useState('')
  const [statistiche, setStatistiche] = useState('')
  const [allegati, setAllegati] = useState<Allegato[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carica educatori e insegnanti
  useEffect(() => {
    const loadRichiedenti = async () => {
      try {
        const res = await fetch('/api/utenti/educatori-insegnanti')
        const data = await res.json()
        if (data.success) {
          setRichiedenti(data.data || [])
        }
      } catch (err) {
        console.error('Errore caricamento richiedenti:', err)
      } finally {
        setIsLoadingRichiedenti(false)
      }
    }
    loadRichiedenti()
  }, [])

  // Gestione upload file (simulato - per ora salva solo il nome)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAllegati: Allegato[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // In produzione, qui si caricherebbe su Supabase Storage
      // Per ora, creiamo un URL temporaneo
      const url = URL.createObjectURL(file)
      newAllegati.push({
        nome: file.name,
        url: url,
        tipo: file.type
      })
    }
    setAllegati([...allegati, ...newAllegati])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAllegato = (index: number) => {
    const newAllegati = [...allegati]
    newAllegati.splice(index, 1)
    setAllegati(newAllegati)
  }

  // Invia richiesta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRichiedente) {
      setSubmitError('Seleziona un richiedente')
      return
    }
    if (!obiettivo.trim()) {
      setSubmitError('Inserisci l\'obiettivo dell\'esercizio')
      return
    }
    if (!descrizione.trim()) {
      setSubmitError('Inserisci la descrizione dell\'esercizio')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/richieste-esercizi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_richiedente: selectedRichiedente,
          obiettivo,
          descrizione,
          contenuti,
          azione_utente: azioneUtente,
          statistiche,
          allegati
        })
      })

      const data = await res.json()

      if (data.success) {
        setSubmitSuccess(true)
        // Reset form
        setObiettivo('')
        setDescrizione('')
        setContenuti('')
        setAzioneUtente('')
        setStatistiche('')
        setAllegati([])
        setSelectedRichiedente('')
      } else {
        setSubmitError(data.message || 'Errore durante l\'invio')
      }
    } catch (err) {
      setSubmitError('Errore di connessione')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Richiesta Inviata!
          </h2>
          <p className="text-green-600 mb-6">
            La tua richiesta è stata inviata con successo. Riceverai una notifica quando l'esercizio sarà pronto.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSubmitSuccess(false)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Nuova Richiesta
            </button>
            <Link
              href="/admin"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
            >
              Torna al Pannello
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-4 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Richiedi Esercizio
            </h1>
            <p className="text-white/80 text-sm">
              Descrivi il nuovo esercizio che ti serve
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selezione Richiedente */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-purple-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <User className="h-5 w-5 text-purple-600" />
            Richiedente
          </label>
          {isLoadingRichiedenti ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </div>
          ) : (
            <select
              value={selectedRichiedente}
              onChange={(e) => setSelectedRichiedente(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
              required
            >
              <option value="">-- Seleziona educatore/insegnante --</option>
              {richiedenti.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.cognome} {r.nome} ({r.ruolo})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Obiettivo */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-orange-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <Target className="h-5 w-5 text-orange-600" />
            Obiettivo dell'Esercizio
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Qual è lo scopo principale di questo esercizio? Cosa vuoi che l'utente impari o migliori?
          </p>
          <textarea
            value={obiettivo}
            onChange={(e) => setObiettivo(e.target.value)}
            placeholder="Es: Migliorare la capacità di riconoscere le emozioni base attraverso le espressioni facciali..."
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none min-h-[100px] resize-y"
            required
          />
        </div>

        {/* Descrizione */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-blue-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            Descrizione dell'Esercizio
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Descrivi in dettaglio cosa deve fare l'esercizio, come funziona e come si presenta.
          </p>
          <textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Es: L'esercizio mostra una foto di una persona con un'espressione facciale. L'utente deve selezionare tra 4 opzioni quale emozione rappresenta..."
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none min-h-[150px] resize-y"
            required
          />
        </div>

        {/* Contenuti */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-green-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <Package className="h-5 w-5 text-green-600" />
            Contenuti dell'Esercizio
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Cosa deve contenere? (pittogrammi ARASAAC, testo, immagini, video, suoni, file specifici...)
          </p>
          <textarea
            value={contenuti}
            onChange={(e) => setContenuti(e.target.value)}
            placeholder="Es: Pittogrammi delle emozioni da ARASAAC, foto reali di persone, audio con il nome dell'emozione..."
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none min-h-[100px] resize-y"
          />
        </div>

        {/* Azione Utente */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-amber-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <CheckCircle className="h-5 w-5 text-amber-600" />
            Azione per Esito Positivo
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Cosa deve fare l'utente per completare correttamente l'esercizio?
          </p>
          <textarea
            value={azioneUtente}
            onChange={(e) => setAzioneUtente(e.target.value)}
            placeholder="Es: Toccare/cliccare sull'opzione corretta entro 30 secondi. Se corretto, mostrare feedback positivo e passare alla prossima domanda..."
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none min-h-[100px] resize-y"
          />
        </div>

        {/* Statistiche */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-teal-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Statistiche da Analizzare
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Quali dati vuoi raccogliere e analizzare? (tempi, errori, progressi...)
          </p>
          <textarea
            value={statistiche}
            onChange={(e) => setStatistiche(e.target.value)}
            placeholder="Es: Tempo di risposta, numero di errori per emozione, progressione nel tempo, emozioni più difficili da riconoscere..."
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none min-h-[100px] resize-y"
          />
        </div>

        {/* Allegati */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-pink-200">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <Paperclip className="h-5 w-5 text-pink-600" />
            Allegati (opzionale)
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Carica immagini, documenti o esempi che possono aiutare a capire meglio la tua richiesta.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-xl hover:bg-pink-200 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Carica File
          </button>

          {allegati.length > 0 && (
            <div className="mt-3 space-y-2">
              {allegati.map((allegato, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{allegato.nome}</span>
                  <button
                    type="button"
                    onClick={() => removeAllegato(index)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Errore */}
        {submitError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700">
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Invio in corso...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Invia Richiesta
            </>
          )}
        </button>
      </form>
    </div>
  )
}
