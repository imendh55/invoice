'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Filter, Eye, Trash2, Download,
  ChevronLeft, ChevronRight, FileText,
  CheckCircle, XCircle, Clock, Upload,
  RefreshCw, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders } from '@/lib/api/config'
import { toast } from 'sonner'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────
interface InvoiceItem {
  id:            number
  fileName:      string
  status:        string
  extractedData: {
    fournisseur?:   string
    numeroFacture?: string
    date?:          string
    totalTTC?:      number | null
  }
  total_ttc?:    number | null
  createdAt?:    string
}

interface PaginatedResponse {
  items:      InvoiceItem[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

// ── Config statuts ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  uploaded:  { label: 'Uploadée',  color: 'bg-blue-500/15 text-blue-600 border-blue-200',    icon: <Upload className="h-3 w-3" /> },
  extracted: { label: 'Extraite',  color: 'bg-purple-500/15 text-purple-600 border-purple-200', icon: <FileText className="h-3 w-3" /> },
  validated: { label: 'Validée',   color: 'bg-green-500/15 text-green-600 border-green-200',  icon: <CheckCircle className="h-3 w-3" /> },
  rejected:  { label: 'Rejetée',   color: 'bg-red-500/15 text-red-600 border-red-200',        icon: <XCircle className="h-3 w-3" /> },
  en_cours:  { label: 'En cours',  color: 'bg-yellow-500/15 text-yellow-600 border-yellow-200', icon: <Clock className="h-3 w-3" /> },
}

function getStatus(s: string) {
  return STATUS_CONFIG[s] ?? { label: s, color: 'bg-muted text-muted-foreground', icon: null }
}

function fmt(v?: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

function fmtDate(s?: string) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

// ── Composant principal ───────────────────────────────────────
export default function HistoryPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { token }    = useAuth()

  // État des filtres
  const [query,  setQuery]  = useState(searchParams.get('keyword') || '')
  const [status, setStatus] = useState(searchParams.get('status')  || 'all')
  const [page,   setPage]   = useState(1)
  const limit = 15

  // Données
  const [data,      setData]      = useState<PaginatedResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Dialogue de confirmation
  const [deleteId,      setDeleteId]      = useState<number | null>(null)
  const [rejectId,      setRejectId]      = useState<number | null>(null)
  const [isActioning,   setIsActioning]   = useState(false)

  // ── Chargement des factures ───────────────────────────────
  const load = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page',  String(page))
      params.set('limit', String(limit))
      if (query.trim()) params.set('query', query.trim())
      if (status && status !== 'all') params.set('status', status)

      const res = await fetch(`${API_BASE_URL}/invoices/history?${params}`, {
        headers: getHeaders(token),
      })
      if (!res.ok) throw new Error('Erreur chargement')
      const json: PaginatedResponse = await res.json()
      setData(json)
    } catch {
      toast.error('Impossible de charger l\'historique')
    } finally {
      setIsLoading(false)
    }
  }, [token, page, query, status])

  useEffect(() => { load() }, [load])

  // Reset page quand filtre change
  const applyFilters = () => { setPage(1); load() }

  // ── Rejeter une facture ───────────────────────────────────
  const handleReject = async (id: number) => {
    if (!token) return
    setIsActioning(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${id}/validate`, {
        method:  'POST',
        headers: getHeaders(token),
        body:    JSON.stringify({ corrections: { status: 'rejected' } }),
      })
      if (!res.ok) throw new Error()

      // Mettre à jour localement sans recharger
      setData(prev => prev ? {
        ...prev,
        items: prev.items.map(inv =>
          inv.id === id ? { ...inv, status: 'rejected' } : inv
        )
      } : prev)
      toast.success('Facture rejetée')
    } catch {
      toast.error('Erreur lors du rejet')
    } finally {
      setIsActioning(false)
      setRejectId(null)
    }
  }

  // ── Supprimer une facture ─────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!token) return
    setIsActioning(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()

      setData(prev => prev ? {
        ...prev,
        items: prev.items.filter(inv => inv.id !== id),
        total: prev.total - 1,
      } : prev)
      toast.success('Facture supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setIsActioning(false)
      setDeleteId(null)
    }
  }

  // ── Export CSV ────────────────────────────────────────────
  const handleExport = async () => {
    if (!token) return
    setIsExporting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `factures_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV téléchargé')
    } catch {
      toast.error('Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Historique des factures</h1>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.total} facture${data.total > 1 ? 's' : ''} au total` : 'Chargement...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Export...' : 'Exporter CSV'}
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, fournisseur, n° facture..."
                className="pl-10"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
              />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="uploaded">Uploadée</SelectItem>
                <SelectItem value="extracted">Extraite</SelectItem>
                <SelectItem value="validated">Validée</SelectItem>
                <SelectItem value="rejected">Rejetée</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={applyFilters} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-14 w-14 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-muted-foreground">Aucune facture trouvée</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {query || (status && status !== 'all') ? 'Essayez d\'autres filtres' : 'Importez vos premières factures'}
              </p>
              {!query && (!status || status === 'all') && (
                <Button className="mt-4" onClick={() => router.push('/dashboard/import')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer une facture
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((inv) => {
                    const cfg = getStatus(inv.status)
                    const ttc = inv.extractedData?.totalTTC ?? inv.total_ttc
                    return (
                      <TableRow key={inv.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground text-sm font-mono">
                          #{inv.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium" title={inv.fileName}>
                              {inv.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.extractedData?.fournisseur || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {inv.extractedData?.numeroFacture || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(inv.extractedData?.date || inv.createdAt)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {fmt(ttc)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} flex items-center gap-1 w-fit text-xs border`}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Voir */}
                            <Link href={`/dashboard/invoice/${inv.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir la facture">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            {/* Rejeter (seulement si pas déjà rejeté/validé) */}
                            {inv.status !== 'rejected' && inv.status !== 'validated' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Rejeter"
                                onClick={() => setRejectId(inv.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Supprimer */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Supprimer"
                              onClick={() => setDeleteId(inv.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} sur {data.totalPages} · {data.total} résultats
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    {/* Numéros de pages */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const p = Math.max(1, Math.min(data.totalPages - 4, page - 2)) + i
                        if (p > data.totalPages) return null
                        return (
                          <Button
                            key={p}
                            variant={p === page ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline" size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
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

      {/* Dialogue : Confirmer le rejet */}
      <AlertDialog open={rejectId !== null} onOpenChange={() => setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeter la facture
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirmez-vous le rejet de la facture #{rejectId} ?
              Cette action marquera la facture comme rejetée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => rejectId && handleReject(rejectId)}
              disabled={isActioning}
            >
              {isActioning ? 'Rejet...' : 'Confirmer le rejet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue : Confirmer la suppression */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Supprimer la facture
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la facture #{deleteId} ?
              Cette action est <strong>irréversible</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isActioning}
            >
              {isActioning ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
