'use client'

import Link from 'next/link'
import {
  Users, FileText, CheckCircle, XCircle,
  TrendingUp, BarChart3, Clock, Shield
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useState, useEffect } from 'react'
import { getAdminStats, AdminStats } from '@/lib/api/admin'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const { token, user } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadQuickStats = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await getAdminStats(token)
      setStats(data)
    } catch (error) {
      toast.error("Impossible de charger les statistiques rapides")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQuickStats()
  }, [token])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Administrateur</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue {user?.prenom} • Vue d'ensemble du système PharmaOCR
        </p>
      </div>

      {/* KPIs Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatCard
          title="Total Factures"
          value={stats?.invoices.total || 0}
          icon={<FileText className="h-6 w-6" />}
          color="blue"
        />
        <QuickStatCard
          title="Validées"
          value={stats?.invoices.validated || 0}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          sub={`${stats?.invoices.successRate || 0}% de succès`}
        />
        <QuickStatCard
          title="Rejetées"
          value={stats?.invoices.rejected || 0}
          icon={<XCircle className="h-6 w-6" />}
          color="red"
        />
        <QuickStatCard
          title="Utilisateurs"
          value={stats?.users.total || 0}
          icon={<Users className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Cartes d'accès rapide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/admin/stats">
          <Card className="hover:shadow-xl transition-all cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <BarChart3 className="h-7 w-7 text-primary" />
                Statistiques Globales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Graphiques détaillés, évolution mensuelle, répartition des factures et plus.
              </p>
              <Button variant="outline" className="mt-6 group-hover:bg-primary group-hover:text-white">
                Accéder aux statistiques détaillées
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/users">
          <Card className="hover:shadow-xl transition-all cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Users className="h-7 w-7 text-violet-600" />
                Gestion Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ajouter, modifier, supprimer des utilisateurs et gérer les rôles.
              </p>
              <Button variant="outline" className="mt-6 group-hover:bg-violet-600 group-hover:text-white">
                Gérer les utilisateurs
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/logs">
          <Card className="hover:shadow-xl transition-all cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Clock className="h-7 w-7 text-amber-600" />
                Logs Système
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Consulter l&apos;historique complet des activités du système.
              </p>
              <Button variant="outline" className="mt-6 group-hover:bg-amber-600 group-hover:text-white">
                Voir les logs
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Infos rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu Rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats?.invoices.successRate || 0}%</p>
              <p className="text-sm text-muted-foreground">Taux de succès OCR</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.invoices.newThisWeek || 0}</p>
              <p className="text-sm text-muted-foreground">Nouvelles factures cette semaine</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.users.newThisWeek || 0}</p>
              <p className="text-sm text-muted-foreground">Nouveaux utilisateurs cette semaine</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Composant réutilisable pour les KPIs rapides
function QuickStatCard({
  title,
  value,
  icon,
  color = "blue",
  sub
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  const colors = {
    blue: "text-blue-600 bg-blue-500/10",
    green: "text-green-600 bg-green-500/10",
    red: "text-red-600 bg-red-500/10",
    purple: "text-purple-600 bg-purple-500/10",
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-4xl font-bold mt-3">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
          </div>
          <div className={`p-4 rounded-2xl ${colors[color as keyof typeof colors] || colors.blue}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
