'use client'

import { useState, useEffect } from 'react'
import {
  Users, FileText, CheckCircle, XCircle,
  TrendingUp, Euro, Shield, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts'
import { useAuth } from '@/lib/auth-context'
import { getAdminStats, AdminStats } from '@/lib/api/admin'
import { toast } from 'sonner'
import { Dirent } from 'fs'

export default function AdminStatsPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStats = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await getAdminStats(token)
      setStats(data)
      toast.success('Statistiques actualisées')
    } catch (error) {
      toast.error('Impossible de charger les statistiques')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [token])

  // Graphiques
  const pieData = stats?.invoices ? [
    { name: 'Validées', value: stats.invoices.validated, fill: '#16a34a' },
    { name: 'Rejetées', value: stats.invoices.rejected, fill: '#ef4444' },
    { name: 'Uploadées', value: stats.invoices.uploaded, fill: '#3b82f6' },
    { name: 'Extraites', value: stats.invoices.extracted, fill: '#8b5cf6' },
  ].filter(item => item.value > 0) : []

  const monthlyData = stats?.monthlyData || []

  // Limiter à 3 éléments seulement
  const recentUsers = stats?.recentUsers?.slice(0, 3) || []
  const recentInvoices = stats?.recentInvoices?.slice(0, 3) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistiques Globales</h1>
          <p className="text-muted-foreground">Vue détaillée et graphiques du système</p>
        </div>
        <Button onClick={loadStats} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Factures" value={stats?.invoices.total || 0} icon={<FileText />} color="blue" />
        <StatCard title="Validées" value={stats?.invoices.validated || 0} icon={<CheckCircle />} color="green" sub={`Taux: ${stats?.invoices.successRate || 0}%`} />
        <StatCard title="Rejetées" value={stats?.invoices.rejected || 0} icon={<XCircle />} color="red" />
        <StatCard title="Montant TTC" value={`${stats?.invoices.totalTTC?.toLocaleString('fr-FR') || 0} DT`} icon={<Euro />} color="amber" />
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des factures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="natural" dataKey="total" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
                  <Area type="natural" dataKey="validated" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections limitées à 3 éléments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3 Derniers Utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle>3 Derniers Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{user.prenom} {user.nom}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun utilisateur récent</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3 Dernières Factures */}
        <Card>
          <CardHeader>
            <CardTitle>3 Dernières Factures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{inv.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{inv.totalTTC ? `${inv.totalTTC} €` : '-'}</p>
                      <Badge variant="outline" className="text-xs mt-1">{inv.status}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucune facture récente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Composant StatCard
function StatCard({
  title,
  value,
  icon,
  color = "blue",
  sub
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    red: "bg-red-500/10 text-red-600",
    amber: "bg-amber-500/10 text-amber-600",
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.blue}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
