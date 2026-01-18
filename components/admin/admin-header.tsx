/**
 * Header Admin - Barra superiore colorata
 */
'use client'

import { useState } from 'react'
import {
  Menu,
  User,
  ChevronDown,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/components/auth'
import { RoleBadge } from '@/components/ui/badge'

interface AdminHeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, profile, signOut } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    console.log('[ADMIN HEADER] Logout clicked')
    setIsUserMenuOpen(false)
    try {
      await signOut()
    } catch (error) {
      console.error('[ADMIN HEADER] Errore logout:', error)
    }
  }

  return (
    <header className="bg-gradient-to-r from-cyan-400 to-teal-500 text-white sticky top-0 z-40 shadow-xl">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="font-bold text-lg text-green-600">TC</span>
            </div>
            <span className="font-bold hidden sm:block drop-shadow-md">🎨 Pannello Admin</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 bg-orange-400 rounded-full flex items-center justify-center shadow-md">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold drop-shadow">
                  {profile?.nome} {profile?.cognome}
                </p>
                {profile?.ruolo && (
                  <span className="text-xs text-yellow-200 capitalize font-semibold">
                    {profile.ruolo}
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.nome} {profile?.cognome}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {profile?.ruolo && (
                      <div className="mt-2">
                        <RoleBadge role={profile.ruolo} />
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Esci
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
