/**
 * Dashboard Educatore - Placeholder
 */
'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { LayoutDashboard, Users, ClipboardList, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
          <LayoutDashboard className="h-8 w-8" />
          Dashboard Educatore
        </h1>
        <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
          Benvenuto, {profile?.nome} {profile?.cognome}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/utenti"
          className="bg-white rounded-2xl p-6 shadow-lg border-4 border-purple-200 hover:scale-105 transition-all"
        >
          <Users className="h-12 w-12 text-purple-500 mb-4" />
          <h3 className="font-bold text-xl text-gray-800">I Miei Utenti</h3>
          <p className="text-gray-600 mt-2">Gestisci i tuoi utenti assegnati</p>
        </Link>

        <Link
          href="/admin/assegna-esercizi"
          className="bg-white rounded-2xl p-6 shadow-lg border-4 border-orange-200 hover:scale-105 transition-all"
        >
          <ClipboardList className="h-12 w-12 text-orange-500 mb-4" />
          <h3 className="font-bold text-xl text-gray-800">Assegna Esercizi</h3>
          <p className="text-gray-600 mt-2">Assegna esercizi ai tuoi utenti</p>
        </Link>

        <Link
          href="/admin/risultati"
          className="bg-white rounded-2xl p-6 shadow-lg border-4 border-green-200 hover:scale-105 transition-all"
        >
          <TrendingUp className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="font-bold text-xl text-gray-800">Risultati</h3>
          <p className="text-gray-600 mt-2">Visualizza i progressi degli utenti</p>
        </Link>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-800 mb-2">Pagina in costruzione</h3>
        <p className="text-blue-700">
          Questa dashboard sarà personalizzata con statistiche e funzionalità specifiche per gli educatori.
        </p>
      </div>
    </div>
  )
}
