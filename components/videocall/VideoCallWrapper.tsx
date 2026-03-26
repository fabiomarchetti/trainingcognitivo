/**
 * Wrapper per VideoCallProvider con import dinamico (ssr: false)
 * Necessario perche WebRTC e le API media sono solo browser
 */
'use client'

import dynamic from 'next/dynamic'

const VideoCallProvider = dynamic(
  () => import('./VideoCallProvider').then((mod) => ({ default: mod.VideoCallProvider })),
  { ssr: false }
)

export default function VideoCallWrapper({ children }: { children: React.ReactNode }) {
  return <VideoCallProvider>{children}</VideoCallProvider>
}
