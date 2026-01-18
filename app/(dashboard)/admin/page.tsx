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
    <div className="space-y-4">
      {/* Header con titolo */}
      <div className="bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 rounded-2xl p-4 text-white shadow-xl border-2 border-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black flex items-center gap-2 drop-shadow-lg">
              <Heart className="h-6 w-6 lg:h-8 lg:w-8 animate-pulse" />
              Pannello Amministrativo
            </h1>
            <p className="text-white/90 mt-1 font-semibold text-sm lg:text-base drop-shadow">
              🌟 Gestione completa del sistema TrainingCognitivo
            </p>
          </div>
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-xl font-bold hover:scale-105 transition-all shadow-lg">
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Utenti Totali"
          value="--"
          icon={<Users className="h-6 w-6 text-red-500" />}
          bgColor="bg-red-50"
          borderColor="border-red-200"
        />
        <StatCard
          label="Amministratori"
          value="--"
          icon={<UserCheck className="h-6 w-6 text-green-500" />}
          bgColor="bg-green-50"
          borderColor="border-green-200"
        />
        <StatCard
          label="Educatori"
          value="--"
          icon={<GraduationCap className="h-6 w-6 text-blue-500" />}
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
        />
        <StatCard
          label="Utenti"
          value="--"
          icon={<Heart className="h-6 w-6 text-emerald-500" />}
          bgColor="bg-emerald-50"
          borderColor="border-emerald-200"
        />
      </div>

      {/* Azioni Rapide */}
      <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-cyan-200">
        <h2 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
          ⚡ Azioni Rapide
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionButton
            href="/admin/utenti"
            label="Nuovo Utente"
            icon={<UserPlus className="h-4 w-4" />}
            bgColor="bg-gradient-to-r from-red-400 to-red-500"
          />
          <ActionButton
            href="/admin/utenti"
            label="Gestisci Utenti"
            icon={<Users className="h-4 w-4" />}
            bgColor="bg-gradient-to-r from-amber-400 to-amber-500"
          />
          <ActionButton
            href="/admin/log-accessi"
            label="Visualizza Log"
            icon={<FileText className="h-4 w-4" />}
            bgColor="bg-gradient-to-r from-cyan-400 to-cyan-500"
          />
          <ActionButton
            href="/admin/impostazioni"
            label="Sistema"
            icon={<Settings className="h-4 w-4" />}
            bgColor="bg-gradient-to-r from-gray-400 to-gray-500"
          />
        </div>
      </div>

      {/* Sezioni di gestione */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
    <div className={`${bgColor} ${borderColor} border-2 rounded-2xl p-3 lg:p-4 flex items-center justify-between shadow-md hover:shadow-lg transition-shadow`}>
      <div>
        <p className="text-xs lg:text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
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
      className={`${bgColor} text-white rounded-xl py-2.5 px-3 lg:py-3 lg:px-4 flex items-center justify-center gap-1.5 text-xs lg:text-sm font-bold hover:scale-105 transition-all shadow-md hover:shadow-lg`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
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
      className={`bg-white rounded-2xl p-4 lg:p-5 border-2 border-gray-200 transition-all duration-200 ${colorClasses[color]} shadow-md hover:shadow-lg hover:scale-105`}
    >
      <h3 className={`text-sm lg:text-base font-semibold ${titleColors[color]}`}>{title}</h3>
      <p className="text-xs text-gray-500 mt-1 hidden sm:block">{description}</p>
    </Link>
  )
}
