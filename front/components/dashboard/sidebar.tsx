// components/dashboard/sidebar.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Upload, History, Settings,
  Users, FileText, ScrollText, LogOut, ChevronDown, Shield,
  BarChart3,  // ← NOUVELLE ICÔNE
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

const userNavItems = [
  { href: '/dashboard',        label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/import', label: 'Importer facture', icon: Upload },
  { href: '/dashboard/history',label: 'Historique',       icon: History },
]

const adminNavItems = [
  { href: '/dashboard/admin',          label: 'Dashboard Admin', icon: LayoutDashboard },
  { href: '/dashboard/admin/stats',    label: 'Statistiques Globales', icon: BarChart3 },   // ← AJOUTÉ
  { href: '/dashboard/admin/users',    label: 'Utilisateurs',    icon: Users },
  { href: '/dashboard/admin/logs',     label: 'Logs système',    icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [adminOpen, setAdminOpen] = useState(
    pathname.startsWith('/dashboard/admin')
  )

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">

      {/* Logo + Utilisateur */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
          <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sidebar-foreground truncate">PharmaOCR</p>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {user ? `${user.prenom} ${user.nom}` : ''}
          </p>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">

        {/* Liens utilisateur */}
        {userNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}

        {/* Section Administration — visible uniquement pour les admins */}
        {isAdmin && (
          <div className="pt-3">
            <div className="px-3 mb-1">
              <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                Administration
              </p>
            </div>

            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/dashboard/admin')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 shrink-0" />
                Administration
              </div>
              <ChevronDown className={cn('h-4 w-4 transition-transform', adminOpen && 'rotate-180')} />
            </button>

            {adminOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                {adminNavItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive(item.href)
                        ? 'text-sidebar-primary font-semibold bg-sidebar-accent/50'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bas de sidebar */}
      <div className="border-t border-sidebar-border p-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/dashboard/settings')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          Paramètres
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
