/**
 * Homepage - TrainingCognitivo
 * Landing page colorata stile infanzia
 */
import Link from 'next/link'
import { Brain, Users, BookOpen, Shield, Heart, Sparkles } from 'lucide-react'

export default function HomePage() {
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
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/80 via-blue-400/70 to-green-400/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-gradient-to-r from-cyan-400 to-teal-500 shadow-2xl border-b-4 border-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                <Brain className="h-7 w-7 text-green-600" />
              </div>
              <span className="text-2xl font-black text-white drop-shadow-lg">TrainingCognitivo</span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 bg-yellow-400 text-green-700 rounded-2xl hover:scale-110 transition-all font-black shadow-xl hover:shadow-2xl"
            >
              Accedi 🚀
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center">
          <section className="container mx-auto px-4 py-20 text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-2xl border-4 border-yellow-400 max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-green-600 mb-6 drop-shadow-lg">
                🌈 Training Cognitivo per Tutti
              </h1>
              <p className="text-2xl text-gray-700 mb-8 font-bold">
                Sistema di esercizi cognitivi personalizzati per supportare
                l&apos;apprendimento e lo sviluppo
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-3xl hover:scale-110 transition-all text-xl font-black shadow-xl hover:shadow-2xl"
                >
                  ✨ Inizia Ora
                </Link>
                <Link
                  href="#funzionalita"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-400 text-white rounded-3xl hover:scale-110 transition-all text-xl font-black shadow-xl hover:shadow-2xl"
                >
                  💡 Scopri di più
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Features Section */}
        <section id="funzionalita" className="py-20 bg-gradient-to-b from-transparent to-white/80">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black text-center text-gray-800 mb-12 flex items-center justify-center gap-3">
              <Sparkles className="h-10 w-10 text-yellow-500 animate-pulse" />
              Funzionalità Principali
              <Sparkles className="h-10 w-10 text-yellow-500 animate-pulse" />
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<Brain className="h-12 w-12 text-cyan-600" />}
                title="Esercizi Cognitivi"
                description="Ampia gamma di esercizi per memoria, attenzione e molto altro"
                color="from-cyan-400 to-blue-400"
              />
              <FeatureCard
                icon={<Users className="h-12 w-12 text-green-600" />}
                title="Multi-Utente"
                description="Gestione completa di educatori e utenti con ruoli dedicati"
                color="from-green-400 to-emerald-400"
              />
              <FeatureCard
                icon={<BookOpen className="h-12 w-12 text-purple-600" />}
                title="Strumenti Assistivi"
                description="Comunicatore, agenda pittogrammi e strumenti per l'accessibilità"
                color="from-purple-400 to-pink-400"
              />
              <FeatureCard
                icon={<Shield className="h-12 w-12 text-orange-600" />}
                title="Sicuro e Privato"
                description="Dati protetti e accessibili solo a utenti autorizzati"
                color="from-orange-400 to-red-400"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-green-400 to-cyan-400 py-16 shadow-2xl">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg flex items-center justify-center gap-3">
              <Heart className="h-10 w-10 animate-pulse" />
              Pronto per iniziare?
            </h2>
            <p className="text-white text-xl mb-8 font-bold drop-shadow">
              Accedi al sistema per iniziare il tuo percorso di training cognitivo
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-10 py-5 bg-yellow-400 text-green-700 rounded-3xl hover:scale-110 transition-all text-2xl font-black shadow-2xl hover:shadow-none"
            >
              🎯 Accedi al Sistema
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-r from-cyan-600 to-green-600 text-white py-8 shadow-2xl">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
              <span className="font-black text-xl">TrainingCognitivo</span>
            </div>
            <p className="text-cyan-100 text-sm font-semibold">
              © {new Date().getFullYear()} AssistiveTech.it - Tutti i diritti riservati
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-gray-200 hover:border-yellow-400 hover:shadow-2xl hover:scale-105 transition-all">
      <div className={`w-16 h-16 bg-gradient-to-r ${color} rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-3 text-center">{title}</h3>
      <p className="text-gray-600 text-center font-semibold">{description}</p>
    </div>
  )
}
