'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  History,
  Settings,
  Users,
  FileText,
  ScrollText,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

const userNavItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/import', label: 'Importer facture', icon: Upload },
  { href: '/dashboard/history', label: 'Historique', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [adminOpen, setAdminOpen] = useState(pathname.includes('/admin'))

  const isAdmin = user?.role === 'admin'

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-sidebar-foreground">PharmaOCR</span>
            <p className="text-xs text-sidebar-foreground/60">
              {user ? `${user.prenom} ${user.nom}` : ''}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {userNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}

          {/* Section Administration (admin seulement) */}
          {isAdmin && (
            <div className="pt-4">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.includes('/admin')
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  Administration
                </div>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', adminOpen && 'rotate-180')}
                />
              </button>

              {adminOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4">
                  {[
                    { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
                    { href: '/dashboard/admin/users', label: 'Utilisateurs', icon: Users },
                    { href: '/dashboard/admin/logs', label: 'Logs système', icon: ScrollText },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        pathname === item.href
                          ? 'text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Section utilisateur */}
        <div className="border-t border-sidebar-border p-4">
          <Link
            href="/dashboard/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2',
              pathname === '/dashboard/settings'
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
      </div>
    </aside>
  )
}
