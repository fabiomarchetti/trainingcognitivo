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
    await signOut()
  }

  return (
    <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-40 shadow-lg">
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
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="font-bold text-sm">TC</span>
            </div>
            <span className="font-semibold hidden sm:block">Pannello Amministrativo</span>
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
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">
                  {profile?.nome} {profile?.cognome}
                </p>
                {profile?.ruolo && (
                  <span className="text-xs text-purple-200 capitalize">
                    ({profile.ruolo})
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
