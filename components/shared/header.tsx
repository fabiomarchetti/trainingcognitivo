/**
 * Header con navigazione e logout
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  User,
  ChevronDown,
  Settings,
  LayoutDashboard,
  GraduationCap,
  Menu,
  X
} from 'lucide-react'
import { useAuth, useIsAdmin } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HeaderProps {
  showNav?: boolean
}

export function Header({ showNav = true }: HeaderProps) {
  const pathname = usePathname()
  const { user, profile, isLoading, signOut } = useAuth()
  const isAdmin = useIsAdmin()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  // Link navigazione basati su ruolo
  const navLinks = []

  if (isAdmin) {
    navLinks.push({
      href: '/admin',
      label: 'Admin',
      icon: Settings,
    })
  }

  if (profile?.ruolo && ['amministratore', 'direttore', 'casemanager', 'educatore'].includes(profile.ruolo)) {
    navLinks.push({
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    })
  }

  navLinks.push({
    href: '/training',
    label: 'Training',
    icon: GraduationCap,
  })

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TC</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">
              TrainingCognitivo
            </span>
          </Link>

          {/* Navigazione Desktop */}
          {showNav && navLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {profile?.nome || user.email?.split('@')[0]}
                    </p>
                    {profile?.ruolo && (
                      <RoleBadge role={profile.ruolo} />
                    )}
                  </div>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-gray-400 transition-transform hidden sm:block',
                    isUserMenuOpen && 'rotate-180'
                  )} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.nome} {profile?.cognome}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Link Mobile */}
                      <div className="md:hidden border-b border-gray-100 py-1">
                        {navLinks.map((link) => {
                          const Icon = link.icon
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Icon className="h-4 w-4" />
                              {link.label}
                            </Link>
                          )
                        })}
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Esci
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Accedi</Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && showNav && (
          <nav className="md:hidden py-4 border-t border-gray-100">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
