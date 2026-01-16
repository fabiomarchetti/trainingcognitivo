/**
 * Layout per pagine di autenticazione
 * Centrato con sfondo gradiente
 */
import { Brain } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header semplice */}
      <header className="py-6">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">TrainingCognitivo</span>
          </Link>
        </div>
      </header>

      {/* Contenuto centrato */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer minimo */}
      <footer className="py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} AssistiveTech.it
      </footer>
    </div>
  )
}
