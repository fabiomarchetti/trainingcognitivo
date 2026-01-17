/**
 * Sidebar Admin - Menu laterale colorato
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Building2,
  FolderTree,
  UserCog,
  Users,
  GraduationCap,
  Heart,
  ClipboardList,
  FolderOpen,
  Puzzle,
  TrendingUp,
  Settings,
  FileText,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const menuItems = [
  {
    label: 'Panoramica',
    href: '/admin',
    icon: BarChart3,
    exact: true,
  },
  { type: 'divider' },
  {
    label: 'Gestione Sedi',
    href: '/admin/sedi',
    icon: Building2,
  },
  {
    label: 'Settori e Classi',
    href: '/admin/settori',
    icon: FolderTree,
  },
  { type: 'divider' },
  {
    label: 'Gestione Direttori',
    href: '/admin/direttori',
    icon: UserCog,
  },
  {
    label: 'Gestione CaseManager',
    href: '/admin/casemanager',
    icon: Users,
  },
  {
    label: 'Gestione Educatori',
    href: '/admin/educatori',
    icon: GraduationCap,
  },
  {
    label: 'Gestione Utenti',
    href: '/admin/utenti',
    icon: Heart,
  },
  {
    label: 'Assegna Esercizi',
    href: '/admin/assegna-esercizi',
    icon: ClipboardList,
  },
  { type: 'divider' },
  {
    label: 'Categorie Esercizi',
    href: '/admin/categorie',
    icon: FolderOpen,
  },
  {
    label: 'Esercizi',
    href: '/admin/esercizi',
    icon: Puzzle,
  },
  { type: 'divider' },
  {
    label: 'Risultati',
    href: '/admin/risultati',
    icon: TrendingUp,
  },
  { type: 'divider' },
  {
    label: 'Sistema',
    href: '/admin/sistema',
    icon: Settings,
  },
  {
    label: 'Log Accessi',
    href: '/admin/log-accessi',
    icon: FileText,
  },
  {
    label: 'Impostazioni',
    href: '/admin/impostazioni',
    icon: SlidersHorizontal,
  },
]

export function AdminSidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-gradient-to-b from-cyan-400 via-teal-400 to-green-500 text-white transition-transform duration-300 lg:translate-x-0 flex flex-col shadow-xl',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <Settings className="h-5 w-5 text-green-600" />
            </div>
            <span className="font-bold text-lg drop-shadow-md">Pannello Admin</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={index} className="my-2 border-t border-white/20" />
            }

            const Icon = item.icon!
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href!)

            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200',
                  isActive
                    ? 'bg-yellow-400 font-bold shadow-lg scale-105'
                    : 'hover:bg-white/20 hover:scale-105'
                )}
                style={{ color: isActive ? '#047857' : '#ffffff' }}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/20 text-center">
          <p className="text-xs text-white/80 font-semibold">🎨 TrainingCognitivo v2.0</p>
        </div>
      </aside>
    </>
  )
}
