/**
 * Pagina Admin - Panoramica
 */
'use client'

import Link from 'next/link'
import {
  Users,
  UserCheck,
  GraduationCap,
  Heart,
  UserPlus,
  Settings,
  FileText,
  RefreshCw
} from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Header con titolo */}
      <div className="bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <Heart className="h-8 w-8 animate-pulse" />
              Pannello Amministrativo
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              🌟 Gestione completa del sistema TrainingCognitivo
            </p>
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-white text-green-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl">
            <RefreshCw className="h-5 w-5" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Utenti Totali"
          value="--"
          icon={<Users className="h-8 w-8 text-red-500" />}
          bgColor="bg-red-50"
          borderColor="border-red-200"
        />
        <StatCard
          label="Amministratori"
          value="--"
          icon={<UserCheck className="h-8 w-8 text-green-500" />}
          bgColor="bg-green-50"
          borderColor="border-green-200"
        />
        <StatCard
          label="Educatori"
          value="--"
          icon={<GraduationCap className="h-8 w-8 text-blue-500" />}
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
        />
        <StatCard
          label="Utenti"
          value="--"
          icon={<Heart className="h-8 w-8 text-emerald-500" />}
          bgColor="bg-emerald-50"
          borderColor="border-emerald-200"
        />
      </div>

      {/* Azioni Rapide */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-cyan-200">
        <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
          ⚡ Azioni Rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionButton
            href="/admin/utenti"
            label="Nuovo Utente"
            icon={<UserPlus className="h-5 w-5" />}
            bgColor="bg-gradient-to-r from-red-400 to-red-500"
          />
          <ActionButton
            href="/admin/utenti"
            label="Gestisci Utenti"
            icon={<Users className="h-5 w-5" />}
            bgColor="bg-gradient-to-r from-amber-400 to-amber-500"
          />
          <ActionButton
            href="/admin/log-accessi"
            label="Visualizza Log"
            icon={<FileText className="h-5 w-5" />}
            bgColor="bg-gradient-to-r from-cyan-400 to-cyan-500"
          />
          <ActionButton
            href="/admin/impostazioni"
            label="Sistema"
            icon={<Settings className="h-5 w-5" />}
            bgColor="bg-gradient-to-r from-gray-400 to-gray-500"
          />
        </div>
      </div>

      {/* Sezioni di gestione */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLinkCard
          href="/admin/sedi"
          title="Gestione Sedi"
          description="Gestisci le sedi del sistema"
          color="purple"
        />
        <QuickLinkCard
          href="/admin/settori"
          title="Settori e Classi"
          description="Organizza settori e classi"
          color="blue"
        />
        <QuickLinkCard
          href="/admin/educatori"
          title="Educatori"
          description="Gestisci gli educatori"
          color="green"
        />
        <QuickLinkCard
          href="/admin/categorie"
          title="Categorie Esercizi"
          description="Gestisci le categorie"
          color="orange"
        />
        <QuickLinkCard
          href="/admin/esercizi"
          title="Esercizi"
          description="Gestisci gli esercizi"
          color="pink"
        />
        <QuickLinkCard
          href="/admin/risultati"
          title="Risultati"
          description="Visualizza i risultati"
          color="teal"
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  bgColor,
  borderColor,
}: {
  label: string
  value: string
  icon: React.ReactNode
  bgColor: string
  borderColor: string
}) {
  return (
    <div className={`${bgColor} ${borderColor} border-4 rounded-3xl p-5 flex items-center justify-between shadow-lg hover:shadow-xl transition-shadow`}>
      <div>
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      {icon}
    </div>
  )
}

function ActionButton({
  href,
  label,
  icon,
  bgColor,
}: {
  href: string
  label: string
  icon: React.ReactNode
  bgColor: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`${bgColor} text-white rounded-2xl py-4 px-5 flex items-center justify-center gap-2 font-bold hover:scale-110 transition-all shadow-lg hover:shadow-2xl`}
    >
      {icon}
      {label}
    </Link>
  )
}

function QuickLinkCard({
  href,
  title,
  description,
  color,
}: {
  href: string
  title: string
  description: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    purple: 'hover:border-purple-400 hover:bg-purple-50',
    blue: 'hover:border-blue-400 hover:bg-blue-50',
    green: 'hover:border-green-400 hover:bg-green-50',
    orange: 'hover:border-orange-400 hover:bg-orange-50',
    pink: 'hover:border-pink-400 hover:bg-pink-50',
    teal: 'hover:border-teal-400 hover:bg-teal-50',
  }

  const titleColors: Record<string, string> = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    pink: 'text-pink-600',
    teal: 'text-teal-600',
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={`bg-white rounded-3xl p-6 border-4 border-gray-200 transition-all duration-200 ${colorClasses[color]} shadow-lg hover:shadow-2xl hover:scale-105`}
    >
      <h3 className={`text-lg font-semibold ${titleColors[color]}`}>{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  )
}
