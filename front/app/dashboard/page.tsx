'use client'

import { useState, useEffect } from 'react'
import { FileText, Clock, CheckCircle, XCircle, Eye, Trash2, Download } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useAuth } from '@/lib/auth-context'
import * as invoicesApi from '@/lib/api/invoices'
import { toast } from 'sonner'

const statusColors = {
  en_cours: 'bg-warning text-warning-foreground',
  en_attente: 'bg-muted text-muted-foreground',
  validee: 'bg-success text-success-foreground',
  rejetee: 'bg-destructive text-destructive-foreground',
  erreur: 'bg-destructive text-destructive-foreground',
}

const statusLabels = {
  en_cours: 'En cours',
  en_attente: 'En attente',
  validee: 'Validée',
  rejetee: 'Rejetée',
  erreur: 'Erreur',
}

export default function DashboardPage() {
  const { token, user, isAuthenticated } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!token || !isAuthenticated) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const [apiStats, apiHistory] = await Promise.all([
          invoicesApi.getDashboardStats(token),
          invoicesApi.getHistory(token, { limit: 5 })
        ])

        setStats(apiStats)
        setInvoices(apiHistory.items.map((inv: any) => ({
          id: inv.id,
          fileName: inv.fileName,
          fournisseur: inv.extractedData?.fournisseur || 'Non extrait',
          date: inv.extractedData?.date || inv.createdAt?.split('T')[0],
          totalTTC: inv.extractedData?.totalTTC,
          status: inv.status
        })))
      } catch (error) {
        console.error("Erreur chargement dashboard:", error)
        toast.error("Impossible de charger les données du dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [token, isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue {user?.prenom || 'Utilisateur'}, sur votre espace de gestion des factures
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Factures" value={stats?.totalInvoices || 0} icon={<FileText className="h-6 w-6" />} />
        <StatsCard title="En cours" value={stats?.enCours || 0} icon={<Clock className="h-6 w-6" />} className="border-warning/50" />
        <StatsCard title="Validées" value={stats?.validees || 0} icon={<CheckCircle className="h-6 w-6" />} className="border-success/50" />
        <StatsCard title="Rejetées" value={stats?.rejetees || 0} icon={<XCircle className="h-6 w-6" />} className="border-destructive/50" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'En cours', value: stats?.enCours || 0, color: 'hsl(45, 93%, 47%)' },
                      { name: 'Validées', value: stats?.validees || 0, color: 'hsl(145, 63%, 42%)' },
                      { name: 'Rejetées', value: stats?.rejetees || 0, color: 'hsl(0, 84%, 60%)' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { color: 'hsl(45, 93%, 47%)' },
                      { color: 'hsl(145, 63%, 42%)' },
                      { color: 'hsl(0, 84%, 60%)' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
            <CardTitle>Factures traitées dans le temps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des factures récentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des factures</CardTitle>
          <Link href="/dashboard/history">
            <Button variant="outline" size="sm">Voir tout</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom fichier</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune facture trouvée
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.fileName}</TableCell>
                    <TableCell>{invoice.fournisseur}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>
                      {invoice.totalTTC ? `${invoice.totalTTC.toFixed(2)} €` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                        {statusLabels[invoice.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/invoice/${invoice.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}