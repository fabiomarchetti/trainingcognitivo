/**
 * Indicatore visivo per assistenza remota attiva
 * Mostra all'utente che l'operatore ha il controllo
 * Include bottone per revocare e highlight del cursore remoto
 */
'use client'

import { Shield, ShieldOff } from 'lucide-react'

interface RemoteIndicatorProps {
  isActive: boolean
  onRevoke: () => void
  highlight: { x: number; y: number } | null
}

export default function RemoteIndicator({
  isActive,
  onRevoke,
  highlight,
}: RemoteIndicatorProps) {
  if (!isActive) return null

  return (
    <>
      {/* Bordo lampeggiante intorno allo schermo */}
      <div className="pointer-events-none fixed inset-0 z-[9998] border-4 border-red-500 animate-pulse" />

      {/* Banner in alto */}
      <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-4 bg-red-600 px-4 py-2 text-white shadow-lg">
        <Shield className="h-5 w-5" />
        <span className="text-sm font-medium">
          Assistenza remota attiva - Un operatore sta controllando la pagina
        </span>
        <button
          onClick={onRevoke}
          className="flex items-center gap-1 rounded-md bg-white px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          <ShieldOff className="h-4 w-4" />
          Riprendi controllo
        </button>
      </div>

      {/* Highlight del cursore remoto */}
      {highlight && (
        <div
          className="pointer-events-none fixed z-[9997] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-blue-500 bg-blue-500/20 animate-ping"
          style={{
            left: highlight.x,
            top: highlight.y,
          }}
        />
      )}
    </>
  )
}
