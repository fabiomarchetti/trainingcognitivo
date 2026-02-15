/**
 * Tool Aggiorna Credenziali Utenti
 *
 * Aggiorna email e password degli utenti con ruolo "utente"
 * Formato: email = nome.cognome@gmail.com, password = nomepwd
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, Key, Users, CheckCircle, XCircle,
  Loader2, AlertTriangle, Shield, RefreshCw
} from 'lucide-react'

interface RisultatoUtente {
  nome: string
  email: string
  password: string
  status: string
}

interface RisultatoAPI {
  success: boolean
  message: string
  data?: {
    totale: number
    aggiornati: number
    dettagli: RisultatoUtente[]
  }
}

export default function AggiornaCredenzialiPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [risultato, setRisultato] = useState<RisultatoAPI | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const eseguiAggiornamento = async () => {
    setIsLoading(true)
    setShowConfirm(false)

    try {
      const response = await fetch('/api/admin/aggiorna-credenziali-utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      setRisultato(data)
    } catch (error) {
      setRisultato({
        success: false,
        message: 'Errore di connessione al server'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setRisultato(null)
    setShowConfirm(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-red-600 shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Torna all'admin"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a
              href="/"
              className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors"
              title="Torna alla Home"
            >
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="h-6 w-6" />
            Aggiorna Credenziali Utenti
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Warning Box */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800">Attenzione</h3>
              <p className="text-amber-700 mt-1">
                Questa operazione aggiornerà le credenziali di <strong>tutti gli utenti con ruolo "utente"</strong>.
                Le email e password esistenti verranno sostituite con il nuovo formato semplificato.
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Formato Credenziali
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Email</p>
              <p className="font-mono text-blue-800 mt-1">nome.cognome@gmail.com</p>
              <p className="text-xs text-blue-500 mt-2">
                Es: mario.rossi@gmail.com
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Password</p>
              <p className="font-mono text-green-800 mt-1">nomepwd</p>
              <p className="text-xs text-green-500 mt-2">
                Es: mariopwd (solo il nome + "pwd")
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            <strong>Note:</strong> I nomi vengono normalizzati (minuscolo, senza accenti, senza spazi).
            Se nome e cognome sono uguali, viene usato solo il nome per l'email.
          </p>
        </div>

        {/* Azione */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Esegui Aggiornamento
          </h2>

          {!showConfirm && !risultato && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isLoading}
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              <Key className="h-6 w-6" />
              Aggiorna Credenziali Utenti
            </button>
          )}

          {showConfirm && !risultato && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-medium text-center">
                  Sei sicuro di voler procedere? Le credenziali attuali verranno sovrascritte.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={eseguiAggiornamento}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Aggiornamento in corso...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Conferma Aggiornamento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {risultato && (
            <div className="space-y-4">
              {/* Risultato generale */}
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                risultato.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {risultato.success ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
                <span className="font-medium">{risultato.message}</span>
              </div>

              {/* Statistiche */}
              {risultato.data && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{risultato.data.totale}</p>
                    <p className="text-sm text-blue-600">Utenti totali</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">{risultato.data.aggiornati}</p>
                    <p className="text-sm text-green-600">Aggiornati con successo</p>
                  </div>
                </div>
              )}

              {/* Dettagli */}
              {risultato.data?.dettagli && risultato.data.dettagli.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold text-gray-700 mb-2">Dettaglio operazioni:</h3>
                  <div className="max-h-80 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Password</th>
                          <th className="text-left p-2">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {risultato.data.dettagli.map((utente, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2">{utente.nome}</td>
                            <td className="p-2 font-mono text-xs">{utente.email}</td>
                            <td className="p-2 font-mono text-xs">{utente.password}</td>
                            <td className="p-2">
                              {utente.status === 'OK' ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" /> OK
                                </span>
                              ) : (
                                <span className="text-red-600 text-xs">{utente.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottone reset */}
              <button
                onClick={reset}
                className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Esegui nuovamente
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
