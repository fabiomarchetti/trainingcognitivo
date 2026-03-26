/**
 * Finestra video flottante, draggable con pointer events nativi
 * Mostra video remoto (grande) e video locale (piccolo, angolo)
 */
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react'

interface FloatingVideoCallProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callerName: string
  isMuted: boolean
  isVideoOff: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onEnd: () => void
}

export default function FloatingVideoCall({
  localStream,
  remoteStream,
  callerName,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onEnd,
}: FloatingVideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [position, setPosition] = useState({ x: -1, y: -1 }) // -1 = non inizializzato
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Inizializza posizione al mount
  useEffect(() => {
    if (typeof window !== 'undefined' && position.x === -1) {
      setPosition({
        x: window.innerWidth - (isExpanded ? 660 : 380),
        y: 80,
      })
    }
  }, [])

  // Aggancia stream ai video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Drag con pointer events
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.drag-handle')) return

    isDraggingRef.current = true
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return

    const newX = e.clientX - dragOffsetRef.current.x
    const newY = e.clientY - dragOffsetRef.current.y

    // Limita ai bordi dello schermo
    const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 360)
    const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 280)

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const width = isExpanded ? 640 : 360
  const height = isExpanded ? 480 : 280

  if (position.x === -1) return null // Non renderizzare prima dell'inizializzazione

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] overflow-hidden rounded-xl shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        width,
        height,
        background: '#1a1a2e',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Barra trascinamento */}
      <div className="drag-handle absolute inset-x-0 top-0 z-10 flex h-8 cursor-grab items-center justify-between bg-black/60 px-3 text-sm text-white select-none active:cursor-grabbing">
        <span className="truncate">{callerName || 'Chiamata in corso'}</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded p-0.5 hover:bg-white/20"
          aria-label={isExpanded ? 'Riduci' : 'Espandi'}
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Video remoto (principale) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Video locale (piccolo, angolo in basso a destra) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-12 right-2 h-[68px] w-[90px] rounded-md border-2 border-white object-cover"
      />

      {/* Controlli */}
      <div className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-center gap-3 bg-black/70">
        <button
          onClick={onToggleMute}
          className={`rounded-md px-3 py-1.5 text-white transition-colors ${
            isMuted ? 'bg-red-600' : 'bg-white/20 hover:bg-white/30'
          }`}
          aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <button
          onClick={onToggleVideo}
          className={`rounded-md px-3 py-1.5 text-white transition-colors ${
            isVideoOff ? 'bg-red-600' : 'bg-white/20 hover:bg-white/30'
          }`}
          aria-label={isVideoOff ? 'Attiva video' : 'Disattiva video'}
        >
          {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>

        <button
          onClick={onEnd}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          aria-label="Chiudi chiamata"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
