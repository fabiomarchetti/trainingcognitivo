/**
 * Pagina Dashboard Educatore - Placeholder
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Benvenuto nella tua area di lavoro</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card Utenti Assegnati */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Utenti Assegnati</h2>
          <p className="text-3xl font-bold text-blue-600">--</p>
          <p className="text-sm text-gray-500 mt-1">utenti attivi</p>
        </div>

        {/* Card Esercizi */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Esercizi Oggi</h2>
          <p className="text-3xl font-bold text-green-600">--</p>
          <p className="text-sm text-gray-500 mt-1">sessioni completate</p>
        </div>

        {/* Card Progressi */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Progressi Settimana</h2>
          <p className="text-3xl font-bold text-purple-600">--</p>
          <p className="text-sm text-gray-500 mt-1">rispetto alla media</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Attivita Recenti</h2>
        <p className="text-gray-500 text-sm">Nessuna attivita recente da mostrare.</p>
      </div>
    </div>
  )
}
