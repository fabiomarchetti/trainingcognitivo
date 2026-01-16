/**
 * Homepage - TrainingCognitivo
 * Landing page con link a login e informazioni
 */
import Link from 'next/link'
import { Brain, Users, BookOpen, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">TrainingCognitivo</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Accedi
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="bg-gradient-to-b from-blue-50 to-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Training Cognitivo per Tutti
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Sistema di esercizi cognitivi personalizzati per supportare
              l&apos;apprendimento e lo sviluppo delle competenze cognitive.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                Inizia Ora
              </Link>
              <Link
                href="#funzionalita"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-lg font-medium"
              >
                Scopri di più
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="funzionalita" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Funzionalità Principali
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Brain className="h-10 w-10 text-blue-600" />}
                title="Esercizi Cognitivi"
                description="Ampia gamma di esercizi per memoria, attenzione, causa-effetto e molto altro."
              />
              <FeatureCard
                icon={<Users className="h-10 w-10 text-green-600" />}
                title="Multi-Utente"
                description="Gestione completa di educatori, pazienti e amministratori con ruoli dedicati."
              />
              <FeatureCard
                icon={<BookOpen className="h-10 w-10 text-purple-600" />}
                title="Strumenti Assistivi"
                description="Comunicatore, agenda pittogrammi e strumenti per l'accessibilità."
              />
              <FeatureCard
                icon={<Shield className="h-10 w-10 text-orange-600" />}
                title="Sicuro e Privato"
                description="Dati protetti e accessibili solo a utenti autorizzati."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pronto per iniziare?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Accedi al sistema per iniziare il tuo percorso di training cognitivo.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-lg font-semibold"
            >
              Accedi al Sistema
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="h-6 w-6" />
            <span className="font-semibold">TrainingCognitivo</span>
          </div>
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} AssistiveTech.it - Tutti i diritti riservati
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
