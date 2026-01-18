/**
 * Layout Admin con Sidebar
 */
'use client'

import { useState } from 'react'
import { AdminSidebar } from './sidebar'
import { AdminHeader } from './admin-header'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col h-screen">
        {/* Header */}
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
