/**
 * Bottone "CHIEDI AIUTO" per utenti/pazienti
 * Sempre visibile nell'area training, grande e accessibile
 * Chiama automaticamente il primo operatore disponibile
 * Priorita: educatore > insegnante > responsabile_centro > sviluppatore
 */
'use client'

import { useState } from 'react'
import { Phone, Loader2 } from 'lucide-react'
import { useVideoCall } from './VideoCallProvider'

const PRIORITA_RUOLI = ['educatore', 'insegnante', 'responsabile_centro', 'sviluppatore']

export default function HelpButton() {
  const { contacts, callStatus, startCall } = useVideoCall()
  const [message, setMessage] = useState<string | null>(null)

  const handleHelp = async () => {
    // Trova il primo operatore online seguendo la priorita
    let operatoreDisponibile = null

    for (const ruolo of PRIORITA_RUOLI) {
      const candidato = contacts.find(
        (c) => c.ruoloCodice === ruolo && c.isOnline
      )
      if (candidato) {
        operatoreDisponibile = candidato
        break
      }
    }

    if (!operatoreDisponibile) {
      setMessage('Nessun operatore disponibile al momento. Riprova tra poco.')
      setTimeout(() => setMessage(null), 5000)
      return
    }

    setMessage(null)
    await startCall(operatoreDisponibile)
  }

  // Non mostrare durante una chiamata attiva
  if (callStatus === 'calling' || callStatus === 'connected' || callStatus === 'ringing') {
    return null
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9990]">
      {/* Messaggio di stato */}
      {message && (
        <div className="mb-3 max-w-[250px] rounded-lg bg-orange-100 px-4 py-3 text-sm text-orange-800 shadow-lg">
          {message}
        </div>
      )}

      {/* Bottone grande */}
      <button
        onClick={handleHelp}
        disabled={callStatus !== 'idle' && callStatus !== 'ended'}
        className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-green-600 text-white shadow-xl shadow-green-600/40 transition-all hover:scale-110 hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Chiedi aiuto"
      >
        <Phone className="h-8 w-8" />
        <span className="mt-1 text-[10px] font-bold uppercase leading-tight">Aiuto</span>
      </button>
    </div>
  )
}
