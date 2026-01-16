/**
 * Pagina Admin - Placeholder
 */
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pannello Amministrazione</h1>
        <p className="text-gray-600 mt-1">Gestisci utenti, sedi, settori e esercizi</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card Utenti */}
        <a
          href="/admin/utenti"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Utenti</h2>
          <p className="text-sm text-gray-600">Gestisci gli utenti del sistema</p>
        </a>

        {/* Card Sedi */}
        <a
          href="/admin/sedi"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sedi</h2>
          <p className="text-sm text-gray-600">Gestisci le sedi</p>
        </a>

        {/* Card Settori */}
        <a
          href="/admin/settori"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Settori</h2>
          <p className="text-sm text-gray-600">Gestisci settori e classi</p>
        </a>

        {/* Card Categorie */}
        <a
          href="/admin/categorie"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Categorie</h2>
          <p className="text-sm text-gray-600">Gestisci le categorie esercizi</p>
        </a>

        {/* Card Esercizi */}
        <a
          href="/admin/esercizi"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Esercizi</h2>
          <p className="text-sm text-gray-600">Gestisci gli esercizi disponibili</p>
        </a>
      </div>
    </div>
  )
}
