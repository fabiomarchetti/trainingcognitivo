/**
 * Hook per connessione WebRTC con API native del browser
 * Gestisce RTCPeerConnection, stream audio/video e ICE
 */
'use client'

import { useState, useRef, useCallback } from 'react'

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'

interface UseWebRTCOptions {
  onIceCandidate: (candidate: RTCIceCandidateInit) => void
  onOffer: (offer: RTCSessionDescriptionInit) => void
  onAnswer: (answer: RTCSessionDescriptionInit) => void
}

interface UseWebRTCReturn {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callStatus: CallStatus
  setCallStatus: (status: CallStatus) => void
  startLocalStream: () => Promise<MediaStream | null>
  createOffer: () => Promise<void>
  handleOffer: (offer: RTCSessionDescriptionInit) => Promise<void>
  handleAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  endCall: () => void
  toggleMute: () => boolean
  toggleVideo: () => boolean
  isMuted: boolean
  isVideoOff: boolean
}

// ICE servers: STUN gratuito + TURN opzionale da env
function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    })
  }

  return servers
}

export function useWebRTC({
  onIceCandidate,
  onOffer,
  onAnswer,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  // Crea la peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
    })

    // Remote stream
    const remote = new MediaStream()
    setRemoteStream(remote)

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remote.addTrack(track)
      })
      // Forza aggiornamento stato
      setRemoteStream(new MediaStream(remote.getTracks()))
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate.toJSON())
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStatus('connected')
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Non chiudiamo subito, WebRTC puo recuperare
        console.warn('[WebRTC] ICE state:', pc.iceConnectionState)
      }
    }

    peerConnectionRef.current = pc
    return pc
  }, [onIceCandidate])

  // Avvia stream locale (camera + microfono)
  const startLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    // navigator.mediaDevices non disponibile su HTTP (tranne localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[WebRTC] mediaDevices non disponibile (serve HTTPS o localhost)')
      // Crea uno stream vuoto come fallback per permettere la connessione
      const emptyStream = new MediaStream()
      localStreamRef.current = emptyStream
      setLocalStream(emptyStream)
      setIsVideoOff(true)
      setIsMuted(true)
      return emptyStream
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('[WebRTC] Errore accesso camera/microfono:', err)
      // Prova solo audio se video fallisce
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        })
        localStreamRef.current = audioStream
        setLocalStream(audioStream)
        setIsVideoOff(true)
        return audioStream
      } catch (audioErr) {
        console.error('[WebRTC] Errore accesso microfono:', audioErr)
        // Fallback: stream vuoto
        const emptyStream = new MediaStream()
        localStreamRef.current = emptyStream
        setLocalStream(emptyStream)
        setIsVideoOff(true)
        setIsMuted(true)
        return emptyStream
      }
    }
  }, [])

  // Aggiungi tracce locali alla peer connection
  const addLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })
  }, [])

  // Processa candidati ICE in coda
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc || !pc.remoteDescription) return

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[WebRTC] Errore aggiunta ICE candidate:', err)
      }
    }
    pendingCandidatesRef.current = []
  }, [])

  // Crea offer (chi chiama)
  const createOffer = useCallback(async () => {
    const pc = createPeerConnection()
    const stream = localStreamRef.current
    if (stream) {
      addLocalTracks(pc, stream)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    onOffer(offer)
  }, [createPeerConnection, addLocalTracks, onOffer])

  // Gestisci offer ricevuta (chi risponde)
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const pc = createPeerConnection()
      const stream = localStreamRef.current
      if (stream) {
        addLocalTracks(pc, stream)
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      onAnswer(answer)

      // Processa candidati in coda
      await processPendingCandidates()
    },
    [createPeerConnection, addLocalTracks, onAnswer, processPendingCandidates]
  )

  // Gestisci answer ricevuta
  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current
      if (!pc) return

      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      // Processa candidati in coda
      await processPendingCandidates()
    },
    [processPendingCandidates]
  )

  // Gestisci ICE candidate ricevuto
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    // Se remote description non e ancora impostata, accoda
    if (!pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('[WebRTC] Errore aggiunta ICE candidate:', err)
    }
  }, [])

  // Chiudi tutto
  const endCall = useCallback(() => {
    // Chiudi peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Ferma stream locale
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }

    setLocalStream(null)
    setRemoteStream(null)
    setCallStatus('ended')
    setIsMuted(false)
    setIsVideoOff(false)
    pendingCandidatesRef.current = []
  }, [])

  // Toggle mute audio
  const toggleMute = useCallback((): boolean => {
    const stream = localStreamRef.current
    if (!stream) return false

    const audioTracks = stream.getAudioTracks()
    const newMuted = !isMuted
    audioTracks.forEach((t) => (t.enabled = !newMuted))
    setIsMuted(newMuted)
    return newMuted
  }, [isMuted])

  // Toggle video
  const toggleVideo = useCallback((): boolean => {
    const stream = localStreamRef.current
    if (!stream) return false

    const videoTracks = stream.getVideoTracks()
    const newVideoOff = !isVideoOff
    videoTracks.forEach((t) => (t.enabled = !newVideoOff))
    setIsVideoOff(newVideoOff)
    return newVideoOff
  }, [isVideoOff])

  return {
    localStream,
    remoteStream,
    callStatus,
    setCallStatus,
    startLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  }
}
