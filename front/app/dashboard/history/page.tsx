'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Trash2, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mockInvoices } from '@/lib/mock-data'
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

type InvoiceStatus = 'en_cours' | 'en_attente' | 'validee' | 'rejetee' | 'erreur'

interface DisplayInvoice {
  id: string | number
  fileName: string
  fournisseur: string
  date: string
  totalTTC?: number
  status: InvoiceStatus
}

export default function HistoryPage() {
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [invoices, setInvoices] = useState<DisplayInvoice[]>(mockInvoices)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 10

  // Charger les factures depuis l'API
  useEffect(() => {
    const loadInvoices = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const params: invoicesApi.SearchParams = {
          page,
          limit,
          query: searchQuery || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }

        const response = await invoicesApi.getHistory(token, params)
        
        setInvoices(response.items.map(inv => ({
          id: inv.id,
          fileName: inv.fileName,
          fournisseur: inv.extractedData?.fournisseur || 'Non extrait',
          date: inv.extractedData?.date || inv.createdAt.split('T')[0],
          totalTTC: inv.extractedData?.totalTTC,
          status: inv.status
        })))
        setTotalPages(response.totalPages)
      } catch {
        // Utiliser les données mock si l'API n'est pas disponible
        console.log('API non disponible, utilisation des données mock')
        
        // Filtrer les données mock localement
        const filtered = mockInvoices.filter(invoice => {
          const matchesSearch = 
            invoice.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.fournisseur.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
          
          const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
          return matchesSearch && matchesStatus
        })
        setInvoices(filtered)
        setTotalPages(1)
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce la recherche
    const timeoutId = setTimeout(loadInvoices, 300)
    return () => clearTimeout(timeoutId)
  }, [token, searchQuery, statusFilter, page])

  const handleDelete = async (id: string | number) => {
    if (!token) return

    try {
      await invoicesApi.deleteInvoice(Number(id), token)
      setInvoices(invoices.filter(inv => inv.id !== id))
      toast.success('Facture supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleExport = async (id: string | number) => {
    if (!token) return

    try {
      const blob = await invoicesApi.exportInvoices(token, {
        format: 'pdf',
        invoiceIds: [Number(id)]
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Export téléchargé')
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique des factures</h1>
        <p className="text-muted-foreground">Consultez et gérez toutes vos factures traitées</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Liste des factures</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-10 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1) // Reset page on search
                  }}
                />
              </div>
              {/* Status Filter */}
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1) // Reset page on filter
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="validee">Validée</SelectItem>
                  <SelectItem value="rejetee">Rejetée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleExport(invoice.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
