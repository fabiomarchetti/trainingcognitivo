/**
 * Sidebar Admin - Menu laterale colorato
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Building2,
  FolderTree,
  Users,
  Shield,
  GraduationCap,
  ClipboardList,
  FolderOpen,
  Puzzle,
  TrendingUp,
  Settings,
  FileText,
  KeyRound,
  X,
  Image,
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

interface MenuItem {
  label?: string
  href?: string
  icon?: any
  exact?: boolean
  type?: string
  developerOnly?: boolean
}

const menuItems: MenuItem[] = [
  {
    label: 'Panoramica',
    href: '/admin',
    icon: BarChart3,
    exact: true,
  },
  {
    label: 'Ruoli',
    href: '/admin/ruoli',
    icon: KeyRound,
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
    label: 'Gestione Staff',
    href: '/admin/staff',
    icon: Shield,
  },
  {
    label: 'Gestione Educatori',
    href: '/admin/educatori',
    icon: GraduationCap,
  },
  {
    label: 'Gestione Utenti',
    href: '/admin/utenti',
    icon: Users,
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
  {
    label: 'Assegna Esercizi',
    href: '/admin/assegna-esercizi',
    icon: ClipboardList,
  },
  { type: 'divider' },
  {
    label: 'Risultati',
    href: '/admin/risultati',
    icon: TrendingUp,
  },
  { type: 'divider' },
  {
    label: 'Log Accessi',
    href: '/admin/log-accessi',
    icon: FileText,
  },
  { type: 'divider', developerOnly: true },
  {
    label: 'Tools Sviluppatore',
    href: '/tools/genera-icone',
    icon: Wrench,
    developerOnly: true,
  },
]

export function AdminSidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('')

  // Carica ruolo utente
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        console.log('[Sidebar] User:', user?.id)
        if (user) {
          // JOIN con tabella ruoli per ottenere il codice del ruolo
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id_ruolo, ruoli(codice)')
            .eq('id', user.id)
            .single()
          console.log('[Sidebar] Profile:', profile, 'Error:', error)
          if (profile && profile.ruoli) {
            const ruoloCodice = (profile.ruoli as any).codice
            setUserRole(ruoloCodice)
            console.log('[Sidebar] Ruolo impostato:', ruoloCodice)
          }
        }
      } catch (err) {
        console.error('[Sidebar] Errore caricamento ruolo:', err)
      }
    }
    loadUserRole()
  }, [])

  // Filtra menu items in base al ruolo
  const filteredMenuItems = menuItems.filter(item => {
    if (item.developerOnly && userRole !== 'sviluppatore') {
      return false
    }
    return true
  })

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
          'fixed top-0 left-0 z-50 h-screen w-64 bg-gradient-to-b from-cyan-400 via-teal-400 to-green-500 text-white transition-transform duration-300 lg:translate-x-0 flex flex-col shadow-xl',
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
          {filteredMenuItems.map((item, index) => {
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
                prefetch={false}
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
