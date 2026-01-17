/**
 * Layout per pagine di autenticazione
 * Stile colorato infanzia
 */
import { Brain } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/landscape_infanzia.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Overlay colorato */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/85 via-blue-400/75 to-green-400/85"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header semplice */}
        <header className="py-6 bg-gradient-to-r from-cyan-400 to-teal-500 shadow-xl border-b-4 border-white">
          <div className="container mx-auto px-4">
            <Link href="/" className="inline-flex items-center gap-3 hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                <Brain className="h-7 w-7 text-green-600" />
              </div>
              <span className="text-2xl font-black text-white drop-shadow-lg">TrainingCognitivo</span>
            </Link>
          </div>
        </header>

        {/* Contenuto centrato */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          {children}
        </main>

        {/* Footer minimo */}
        <footer className="py-4 text-center text-sm text-white font-semibold drop-shadow">
          🎨 © {new Date().getFullYear()} AssistiveTech.it
        </footer>
      </div>
    </div>
  )
}
