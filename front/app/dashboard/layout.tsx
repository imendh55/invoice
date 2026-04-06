'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    // ✅ Non connecté → login
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // ✅ Page admin → vérifier le rôle
    if (pathname.startsWith('/dashboard/admin') && user?.role !== 'admin') {
      router.push('/dashboard') // user normal → dashboard
    }
  }, [isLoading, isAuthenticated, user, router, pathname])

  // Spinner pendant le chargement de l'auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Pas authentifié → rien (la redirection est en cours)
  if (!isAuthenticated) return null

  // Admin requis mais user normal → rien (redirection en cours)
  if (pathname.startsWith('/dashboard/admin') && user?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
