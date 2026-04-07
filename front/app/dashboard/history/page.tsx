'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Eye, Trash2, Search, ChevronLeft, ChevronRight,
  X, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  CalendarDays, DollarSign, FileText, Hash, Building2,
  RotateCcw, ChevronDown, CheckSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders, handleApiResponse } from '@/lib/api/config'
import { toast } from 'sonner'

interface SearchFilters {
  keyword: string; invoiceId: string; filename: string; fournisseur: string
  numeroFacture: string; statuses: string[]; totalMin: string; totalMax: string
  dateFrom: string; dateTo: string; sortBy: string; sortOrder: 'asc' | 'desc'
}
interface Invoice {
  id: number; fileName: string; status: string
  extractedData?: { fournisseur?: string; date?: string; totalTTC?: number; numeroFacture?: string }
  total_ttc?: number; createdAt: string
}

const DEF = (): SearchFilters => ({
  keyword: '', invoiceId: '', filename: '', fournisseur: '', numeroFacture: '',
  statuses: [], totalMin: '', totalMax: '', dateFrom: '', dateTo: '',
  sortBy: 'upload_date', sortOrder: 'desc',
})

const STATUSES = [
  { value: 'uploaded',  label: 'Uploadée',  color: 'bg-blue-500/10 text-blue-600' },
  { value: 'extracted', label: 'Extraite',  color: 'bg-purple-500/10 text-purple-600' },
  { value: 'validated', label: 'Validée',   color: 'bg-green-500/10 text-green-600' },
  { value: 'rejected',  label: 'Rejetée',   color: 'bg-red-500/10 text-red-600' },
  { value: 'en_cours',  label: 'En cours',  color: 'bg-yellow-500/10 text-yellow-600' },
]

const SORTS = [
  { value: 'upload_date', label: 'Date upload' }, { value: 'id', label: 'ID' },
  { value: 'filename', label: 'Nom fichier' }, { value: 'status', label: 'Statut' },
  { value: 'total_ttc', label: 'Montant TTC' },
]

function HistoryInner() {
  const { token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlKeyword = searchParams.get('keyword') ?? ''

  const [filters, setFilters]   = useState<SearchFilters>({ ...DEF(), keyword: urlKeyword })
  const [applied, setApplied]   = useState<SearchFilters>({ ...DEF(), keyword: urlKeyword })
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]         = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const countActive = (f: SearchFilters) =>
    [f.invoiceId, f.filename, f.fournisseur, f.numeroFacture, f.totalMin, f.totalMax, f.dateFrom, f.dateTo]
      .filter(Boolean).length + f.statuses.length

  // Lire keyword URL (depuis header search)
  useEffect(() => {
    if (urlKeyword) {
      const newF = { ...DEF(), keyword: urlKeyword }
      setFilters(newF); setApplied(newF); setPage(1)
      router.replace('/dashboard/history', { scroll: false })
      loadResults(newF, 1)
    }
  }, [urlKeyword]) // eslint-disable-line

  const loadResults = useCallback(async (f: SearchFilters, p: number) => {
    if (!token) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '15' })
      if (f.keyword)         params.append('keyword',        f.keyword)
      if (f.invoiceId)       params.append('invoice_id',     f.invoiceId)
      if (f.filename)        params.append('filename',       f.filename)
      if (f.fournisseur)     params.append('fournisseur',    f.fournisseur)
      if (f.numeroFacture)   params.append('numero_facture', f.numeroFacture)
      if (f.statuses.length) params.append('statuses',       f.statuses.join(','))
      if (f.totalMin)        params.append('total_min',      f.totalMin)
      if (f.totalMax)        params.append('total_max',      f.totalMax)
      if (f.dateFrom)        params.append('date_from',      f.dateFrom)
      if (f.dateTo)          params.append('date_to',        f.dateTo)
      params.append('sort_by', f.sortBy); params.append('sort_order', f.sortOrder)

      const res  = await fetch(`${API_BASE_URL}/invoices/search/advanced?${params}`, { headers: getHeaders(token) })
      const data = await handleApiResponse<any>(res)
      setInvoices(data.items ?? []); setTotal(data.total ?? 0); setTotalPages(data.totalPages ?? 1)
    } catch { toast.error('Erreur lors du chargement') }
    finally   { setIsLoading(false) }
  }, [token])

  // Debounce keyword
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadResults(applied, 1) }, 300)
    return () => clearTimeout(t)
  }, [applied.keyword]) // eslint-disable-line

  useEffect(() => { loadResults(applied, page) }, [page]) // eslint-disable-line
  useEffect(() => { loadResults(DEF(), 1) }, [token]) // eslint-disable-line

  const applyFilters = () => { setApplied({ ...filters }); setPage(1); setPanelOpen(false); loadResults(filters, 1) }
  const resetAll = () => { const d = DEF(); setFilters(d); setApplied(d); setPage(1); loadResults(d, 1); searchRef.current?.focus() }

  const handleSort = (col: string) => {
    const order = applied.sortBy === col && applied.sortOrder === 'desc' ? 'asc' : 'desc'
    const newF  = { ...applied, sortBy: col, sortOrder: order as 'asc' | 'desc' }
    setApplied(newF); setFilters(newF); loadResults(newF, page)
  }

  const toggleStatus = (val: string) => setFilters(f => ({
    ...f, statuses: f.statuses.includes(val) ? f.statuses.filter(s => s !== val) : [...f.statuses, val]
  }))

  const removeFilter = (key: keyof SearchFilters, val?: string) => {
    const newF = key === 'statuses' && val
      ? { ...applied, statuses: applied.statuses.filter(s => s !== val) }
      : key === 'totalMin' ? { ...applied, totalMin: '', totalMax: '' }
      : key === 'dateFrom' ? { ...applied, dateFrom: '', dateTo: '' }
      : { ...applied, [key]: '' }
    setApplied(newF); setFilters(newF); loadResults(newF, 1)
  }

  const handleDelete = async (id: number) => {
    if (!token) return
    try {
      await fetch(`${API_BASE_URL}/invoices/${id}`, { method: 'DELETE', headers: getHeaders(token) })
      toast.success('Facture supprimée'); loadResults(applied, page)
    } catch { toast.error('Erreur lors de la suppression') }
  }

  const sc = (status: string) => STATUSES.find(s => s.value === status) ?? { label: status, color: 'bg-muted text-muted-foreground' }
  const activeCount = countActive(applied)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Historique des factures</h1>
        <p className="text-muted-foreground">{isLoading ? 'Recherche...' : `${total} résultat${total !== 1 ? 's' : ''}`}</p>
      </div>

      {/* Barre recherche */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input ref={searchRef} placeholder="Rechercher par nom, fournisseur, numéro, ID..."
            className="pl-10 pr-10 h-11 text-base" value={applied.keyword}
            onChange={e => setApplied(f => ({ ...f, keyword: e.target.value }))} />
          {applied.keyword && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setApplied(f => ({ ...f, keyword: '' }))}><X className="h-4 w-4" /></button>
          )}
        </div>
        <Button variant={panelOpen || activeCount > 0 ? 'default' : 'outline'} className="h-11 gap-2 px-4"
          onClick={() => setPanelOpen(o => !o)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filtres avancés
          {activeCount > 0 && <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary text-xs font-bold">{activeCount}</span>}
          <ChevronDown className={cn('h-4 w-4 transition-transform', panelOpen && 'rotate-180')} />
        </Button>
        {(activeCount > 0 || applied.keyword) && (
          <Button variant="ghost" className="h-11 gap-2" onClick={resetAll}><RotateCcw className="h-4 w-4" /> Reset</Button>
        )}
      </div>

      {/* Panel filtres */}
      {panelOpen && (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filtres avancés</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FF icon={<Hash className="h-3.5 w-3.5"/>} label="ID exact"><Input type="number" placeholder="ex: 42" value={filters.invoiceId} onChange={e => setFilters(f => ({ ...f, invoiceId: e.target.value }))} /></FF>
              <FF icon={<FileText className="h-3.5 w-3.5"/>} label="N° de facture"><Input placeholder="ex: FAC-2024-001" value={filters.numeroFacture} onChange={e => setFilters(f => ({ ...f, numeroFacture: e.target.value }))} /></FF>
              <FF icon={<FileText className="h-3.5 w-3.5"/>} label="Nom du fichier"><Input placeholder="ex: facture1.pdf" value={filters.filename} onChange={e => setFilters(f => ({ ...f, filename: e.target.value }))} /></FF>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FF icon={<Building2 className="h-3.5 w-3.5"/>} label="Fournisseur"><Input placeholder="ex: Pharma Distribution" value={filters.fournisseur} onChange={e => setFilters(f => ({ ...f, fournisseur: e.target.value }))} /></FF>
              <FF icon={<DollarSign className="h-3.5 w-3.5"/>} label="Montant TTC min (€)"><Input type="number" placeholder="100" value={filters.totalMin} onChange={e => setFilters(f => ({ ...f, totalMin: e.target.value }))} /></FF>
              <FF icon={<DollarSign className="h-3.5 w-3.5"/>} label="Montant TTC max (€)"><Input type="number" placeholder="5000" value={filters.totalMax} onChange={e => setFilters(f => ({ ...f, totalMax: e.target.value }))} /></FF>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FF icon={<CalendarDays className="h-3.5 w-3.5"/>} label="Date upload — depuis"><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></FF>
              <FF icon={<CalendarDays className="h-3.5 w-3.5"/>} label="Date upload — jusqu'à"><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></FF>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2"><CheckSquare className="h-3.5 w-3.5" /> Statuts</Label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(opt => (
                  <button key={opt.value} onClick={() => toggleStatus(opt.value)}
                    className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                      filters.statuses.includes(opt.value) ? `${opt.color} border-current ring-2 ring-offset-1 ring-current/30` : 'border-border text-muted-foreground hover:border-primary/50')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FF icon={<ArrowUpDown className="h-3.5 w-3.5"/>} label="Trier par">
                <Select value={filters.sortBy} onValueChange={v => setFilters(f => ({ ...f, sortBy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SORTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </FF>
              <FF icon={<ArrowUpDown className="h-3.5 w-3.5"/>} label="Ordre">
                <Select value={filters.sortOrder} onValueChange={v => setFilters(f => ({ ...f, sortOrder: v as 'asc' | 'desc' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Décroissant (plus récent)</SelectItem>
                    <SelectItem value="asc">Croissant (plus ancien)</SelectItem>
                  </SelectContent>
                </Select>
              </FF>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setFilters(DEF())}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Réinitialiser</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPanelOpen(false)}>Annuler</Button>
                <Button size="sm" onClick={applyFilters}><Search className="mr-2 h-3.5 w-3.5" /> Appliquer</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges filtres actifs */}
      {(activeCount > 0 || applied.keyword) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Filtres actifs :</span>
          {applied.keyword      && <FB label={`Recherche: "${applied.keyword}"`}      onRemove={() => setApplied(f => ({ ...f, keyword: '' }))} />}
          {applied.invoiceId    && <FB label={`ID: ${applied.invoiceId}`}              onRemove={() => removeFilter('invoiceId')} />}
          {applied.fournisseur  && <FB label={`Fournisseur: ${applied.fournisseur}`}   onRemove={() => removeFilter('fournisseur')} />}
          {applied.filename     && <FB label={`Fichier: ${applied.filename}`}           onRemove={() => removeFilter('filename')} />}
          {applied.numeroFacture && <FB label={`N°: ${applied.numeroFacture}`}         onRemove={() => removeFilter('numeroFacture')} />}
          {applied.statuses.map(s => <FB key={s} label={`Statut: ${STATUSES.find(o => o.value === s)?.label ?? s}`} onRemove={() => removeFilter('statuses', s)} />)}
          {(applied.totalMin || applied.totalMax) && <FB label={`Montant: ${applied.totalMin || '0'}€–${applied.totalMax || '∞'}€`} onRemove={() => removeFilter('totalMin')} />}
          {(applied.dateFrom || applied.dateTo)   && <FB label={`Dates: ${applied.dateFrom || '...'} → ${applied.dateTo || '...'}`} onRemove={() => removeFilter('dateFrom')} />}
        </div>
      )}

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SH col="id"          a={applied} s={handleSort}>ID</SH>
                <SH col="filename"    a={applied} s={handleSort}>Nom fichier</SH>
                <TableHead>Fournisseur</TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead>Date doc.</TableHead>
                <SH col="total_ttc"   a={applied} s={handleSort} className="text-right">Total TTC</SH>
                <SH col="status"      a={applied} s={handleSort}>Statut</SH>
                <SH col="upload_date" a={applied} s={handleSort}>Uploadée le</SH>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm">Recherche en cours...</span>
                  </div>
                </TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Aucune facture trouvée</p>
                  <p className="text-sm mt-1">Modifiez vos critères de recherche</p>
                  <Button variant="ghost" size="sm" className="mt-3" onClick={resetAll}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Réinitialiser</Button>
                </TableCell></TableRow>
              ) : invoices.map(inv => {
                const s = sc(inv.status)
                return (
                  <TableRow key={inv.id} className="group">
                    <TableCell className="font-mono text-sm text-muted-foreground">#{inv.id}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate" title={inv.fileName}>{inv.fileName}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.extractedData?.fournisseur || '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{inv.extractedData?.numeroFacture || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inv.extractedData?.date || '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {(inv.extractedData?.totalTTC ?? inv.total_ttc) ? `${(inv.extractedData?.totalTTC ?? inv.total_ttc)!.toFixed(2)} €` : '—'}
                    </TableCell>
                    <TableCell><span className={cn('px-2 py-1 rounded-full text-xs font-medium', s.color)}>{s.label}</span></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/invoice/${inv.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inv.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page}/{totalPages} — {total} résultat{total !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>«</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                  return <Button key={p} variant={page === p ? 'default' : 'outline'} size="sm" className="w-9 h-8" onClick={() => setPage(p)}>{p}</Button>
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FF({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">{icon}{label}</Label>
      {children}
    </div>
  )
}

function FB({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {label}<button onClick={onRemove} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
    </span>
  )
}

function SH({ col, a, s, children, className }: { col: string; a: SearchFilters; s: (c: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={className}>
      <button className="flex items-center gap-1 hover:text-foreground transition-colors group" onClick={() => s(col)}>
        {children}
        {a.sortBy === col ? (a.sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
      </button>
    </TableHead>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <HistoryInner />
    </Suspense>
  )
}
