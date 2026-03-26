/**
 * Overlay fullscreen per chiamata in arrivo
 * Progettato per utenti anziani: grande, visibile, con suono
 */
'use client'

import { useEffect, useRef } from 'react'
import { Phone, PhoneOff } from 'lucide-react'

interface IncomingCallAlertProps {
  callerName: string
  onAccept: () => void
  onReject: () => void
}

export default function IncomingCallAlert({
  callerName,
  onAccept,
  onReject,
}: IncomingCallAlertProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Suono di squillo
  useEffect(() => {
    // Crea un suono di squillo con Web Audio API
    let audioCtx: AudioContext | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null

    try {
      audioCtx = new AudioContext()

      const playRing = () => {
        if (!audioCtx) return
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        oscillator.frequency.value = 440
        oscillator.type = 'sine'
        gainNode.gain.value = 0.3

        oscillator.start()
        // Squillo breve: 500ms on, poi pausa
        setTimeout(() => {
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx!.currentTime + 0.1)
          setTimeout(() => oscillator.stop(), 100)
        }, 500)
      }

      // Primo squillo immediato
      playRing()
      // Ripeti ogni 1.5 secondi
      intervalId = setInterval(playRing, 1500)
    } catch {
      // Web Audio API non disponibile
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (audioCtx) audioCtx.close()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90">
      {/* Animazione pulsante */}
      <div className="mb-8 flex h-28 w-28 animate-pulse items-center justify-center rounded-full bg-green-500/30">
        <Phone className="h-16 w-16 text-white" />
      </div>

      <h2 className="mb-3 text-3xl font-bold text-white">Chiamata in arrivo</h2>

      <p className="mb-12 text-2xl text-blue-300">{callerName}</p>

      <div className="flex gap-12">
        {/* Accetta */}
        <button
          onClick={onAccept}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-600/50 transition-transform hover:scale-110 active:scale-95"
          aria-label="Accetta chiamata"
        >
          <Phone className="h-10 w-10 text-white" />
        </button>

        {/* Rifiuta */}
        <button
          onClick={onReject}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/50 transition-transform hover:scale-110 active:scale-95"
          aria-label="Rifiuta chiamata"
        >
          <PhoneOff className="h-10 w-10 text-white" />
        </button>
      </div>

      <div className="mt-8 flex gap-8 text-lg text-gray-400">
        <span>Accetta</span>
        <span>Rifiuta</span>
      </div>
    </div>
  )
}
