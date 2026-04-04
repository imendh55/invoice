'use client'

import { FileText, Clock, CheckCircle, XCircle, Users, Eye, Trash2, Download, Edit } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { mockDashboardStats, mockInvoices, mockUsers } from '@/lib/mock-data'
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

const pieData = [
  { name: 'En cours', value: mockDashboardStats.enCours, color: 'hsl(45, 93%, 47%)' },
  { name: 'Validées', value: mockDashboardStats.validees, color: 'hsl(145, 63%, 42%)' },
  { name: 'Rejetées', value: mockDashboardStats.rejetees, color: 'hsl(0, 84%, 60%)' },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-muted-foreground">Gérez les factures et les utilisateurs du système</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Factures"
          value={mockDashboardStats.totalInvoices}
          icon={<FileText className="h-6 w-6" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="En cours"
          value={mockDashboardStats.enCours}
          icon={<Clock className="h-6 w-6" />}
          className="border-warning/50"
        />
        <StatsCard
          title="Validées"
          value={mockDashboardStats.validees}
          icon={<CheckCircle className="h-6 w-6" />}
          className="border-success/50"
        />
        <StatsCard
          title="Utilisateurs"
          value={mockUsers.length}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Factures traitées dans le temps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDashboardStats.monthlyData}>
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

      {/* Invoices Table */}
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInvoices.slice(0, 4).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.fileName}</TableCell>
                  <TableCell>{invoice.fournisseur}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell className="text-right">
                    {invoice.totalTTC ? `${invoice.totalTTC.toFixed(2)} €` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[invoice.status]}>
                      {statusLabels[invoice.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/invoice/${invoice.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des utilisateurs</CardTitle>
          <Link href="/dashboard/admin/users">
            <Button variant="outline" size="sm">Voir tout</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date Anniv</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.prenom} {user.nom}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.dateAnniversaire || '-'}</TableCell>
                  <TableCell>{user.cin || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
