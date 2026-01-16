/**
 * Pagina Training - Placeholder
 */
export default function TrainingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Area Training</h1>
          <p className="text-gray-600 mt-2">Scegli un esercizio per iniziare</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card Causa Effetto */}
          <div className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">🎯</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Causa Effetto</h2>
            <p className="text-sm text-gray-600 text-center">Impara le relazioni causa-effetto</p>
          </div>

          {/* Card Categorizzazione */}
          <div className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-400 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">📦</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Categorizzazione</h2>
            <p className="text-sm text-gray-600 text-center">Raggruppa oggetti simili</p>
          </div>

          {/* Card Memoria */}
          <div className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">🧠</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Memoria</h2>
            <p className="text-sm text-gray-600 text-center">Allena la tua memoria</p>
          </div>
        </div>

        <div className="text-center pt-6">
          <a
            href="/strumenti"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Vai agli Strumenti →
          </a>
        </div>
      </div>
    </div>
  )
}
