'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, ArrowLeft, CheckCircle, XCircle, Save,
  Loader2, AlertCircle, Building2, Calendar, Hash,
  Receipt, Package, Edit3, RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders } from '@/lib/api/config'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────
interface Product {
  nom: string
  quantite: number
  prixUnitaire: number
  total: number
}

interface ExtractedData {
  numeroFacture?: string
  fournisseur?: string
  date?: string
  adresseFournisseur?: string
  client?: string
  adresseClient?: string
  totalHT?: number | null
  tva?: number | null
  totalTTC?: number | null
  produits?: Product[]
  rawText?: string
  // Alias backend snake_case
  invoice_number?: string
  supplier?: string
  total_ht?: number | null
  total_tva?: number | null
  total_ttc?: number | null
}

interface InvoiceDetail {
  id: number
  fileName: string
  filePath?: string
  status: string
  extractedData: ExtractedData
  validatedData?: ExtractedData
  total_ttc?: number | null
  createdAt?: string
}

// ── Statuts ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  uploaded:  { label: 'Uploadée',  color: 'bg-blue-500/15 text-blue-600' },
  extracted: { label: 'Extraite',  color: 'bg-purple-500/15 text-purple-600' },
  validated: { label: 'Validée',   color: 'bg-green-500/15 text-green-600' },
  rejected:  { label: 'Rejetée',   color: 'bg-red-500/15 text-red-600' },
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(v?: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function normalizeData(raw: ExtractedData): ExtractedData {
  return {
    numeroFacture: raw.numeroFacture || raw.invoice_number || '',
    fournisseur: raw.fournisseur || raw.supplier || '',
    date: raw.date || '',
    adresseFournisseur: raw.adresseFournisseur || '',
    client: raw.client || '',
    adresseClient: raw.adresseClient || '',
    totalHT: raw.totalHT ?? raw.total_ht ?? null,
    tva: raw.tva ?? raw.total_tva ?? null,
    totalTTC: raw.totalTTC ?? raw.total_ttc ?? null,
    produits: raw.produits || [],
    rawText: raw.rawText || '',
  }
}

// ── Composant principal ───────────────────────────────────────
export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuth()

  // ✅ CONVERSION EXPLICITE : string → number
  const invoiceId = params?.id ? Number(params.id) : undefined

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState<ExtractedData>({})
  const [products, setProducts] = useState<Product[]>([])

  // ── Chargement de la facture ────────────────────────────
  useEffect(() => {
    // ✅ VALIDATION : invoiceId doit être un nombre valide
    if (!invoiceId || isNaN(invoiceId) || invoiceId <= 0 || !token) {
      setHasError(true)
      setIsLoading(false)
      return
    }

    const fetchInvoice = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
          headers: getHeaders(token),
        })

        if (!res.ok) {
          if (res.status === 404) throw new Error('Facture non trouvée')
          throw new Error('Erreur serveur')
        }

        const data: InvoiceDetail = await res.json()
        setInvoice(data)

        const normalized = normalizeData(data.extractedData || {})
        setForm(normalized)
        setProducts(normalized.produits || [])
      } catch (error) {
        console.error('Erreur chargement facture:', error)
        setHasError(true)
        toast.error('Impossible de charger la facture')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId, token]) // ← invoiceId est maintenant un number

  // ── Recalculer les totaux ───────────────────────────────
  const recalculateTotals = (prods: Product[]) => {
    const ht = prods.reduce((sum, p) => sum + (p.total || 0), 0)
    const tva = form.tva != null ? form.tva : Math.round(ht * 0.2 * 100) / 100
    const ttc = Math.round((ht + tva) * 100) / 100
    setForm(prev => ({ ...prev, totalHT: ht, tva, totalTTC: ttc }))
  }

  // ── Modifier un produit ─────────────────────────────────
  const updateProduct = (idx: number, field: keyof Product, value: string) => {
    setProducts(prev => {
      const updated = [...prev]
      const p = { ...updated[idx] }
      if (field === 'nom') {
        p.nom = value
      } else {
        const num = parseFloat(value) || 0
        ;(p as any)[field] = num
        if (field === 'quantite' || field === 'prixUnitaire') {
          p.total = Math.round(p.quantite * p.prixUnitaire * 100) / 100
        }
      }
      updated[idx] = p
      recalculateTotals(updated)
      return updated
    })
  }

  const addProduct = () => {
    const newProd: Product = { nom: '', quantite: 1, prixUnitaire: 0, total: 0 }
    const updated = [...products, newProd]
    setProducts(updated)
    recalculateTotals(updated)
  }

  const removeProduct = (idx: number) => {
    const updated = products.filter((_, i) => i !== idx)
    setProducts(updated)
    recalculateTotals(updated)
  }

  const resetEdit = () => {
    if (!invoice) return
    const normalized = normalizeData(invoice.extractedData || {})
    setForm(normalized)
    setProducts(normalized.produits || [])
    setIsEditing(false)
  }

  // ── Valider la facture ──────────────────────────────────
  const handleValidate = async () => {
    if (!token || !invoiceId) return
    setIsSaving(true)
    const corrections = { ...form, produits: products, totalHT: form.totalHT, tva: form.tva, totalTTC: form.totalTTC }

    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/validate`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ corrections }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInvoice(prev => prev ? { ...prev, status: 'validated', validatedData: corrections } : prev)
      setIsEditing(false)
      toast.success('✅ Facture validée avec succès !')
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Rejeter la facture ──────────────────────────────────
  const handleReject = async () => {
    if (!token || !invoiceId) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/reject`, {
        method: 'POST',
        headers: getHeaders(token),
      })
      if (!res.ok) throw new Error()
      setInvoice(prev => prev ? { ...prev, status: 'rejected' } : prev)
      toast.success('Facture rejetée')
    } catch {
      toast.error('Erreur lors du rejet')
    } finally {
      setIsSaving(false)
    }
  }

  // ── États de chargement / erreur ────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground">Chargement de la facture...</p>
        </div>
      </div>
    )
  }

  if (hasError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-destructive mb-3" />
        <h2 className="text-xl font-semibold mb-2">Facture introuvable</h2>
        <p className="text-muted-foreground mb-4">
          {!invoiceId || isNaN(invoiceId)
            ? "ID de facture invalide ou manquant"
            : "La facture demandée n'existe pas"}
        </p>
        <Button onClick={() => router.push('/dashboard/history')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'historique
        </Button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, color: 'bg-muted text-muted-foreground' }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {invoice.fileName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
              <span className="text-xs text-muted-foreground">ID #{invoice.id}</span>
              {invoice.createdAt && (
                <span className="text-xs text-muted-foreground">
                  · {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        {invoice.status !== 'validated' && invoice.status !== 'rejected' && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={resetEdit} disabled={isSaving}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Annuler
                </Button>
                <Button variant="outline" onClick={handleReject} disabled={isSaving}
                  className="border-destructive/50 text-destructive hover:bg-destructive/5">
                  <XCircle className="mr-2 h-4 w-4" /> Rejeter
                </Button>
                <Button onClick={handleValidate} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Enregistrer et valider
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleReject} disabled={isSaving}
                  className="border-destructive/50 text-destructive hover:bg-destructive/5">
                  <XCircle className="mr-2 h-4 w-4" /> Rejeter
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Corriger
                </Button>
                <Button onClick={handleValidate} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Valider
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Colonne gauche : aperçu document ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Document original</CardTitle></CardHeader>
            <CardContent>
              <div className="aspect-[3/4] rounded-lg bg-muted border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors group"
                onClick={() => invoice.filePath && window.open(`http://localhost:8000/${invoice.filePath}`, '_blank')}>
                <FileText className="h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 transition-colors mb-3" />
                <p className="text-sm font-medium text-center px-4 truncate max-w-full">{invoice.fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Cliquez pour voir le document original</p>
              </div>
            </CardContent>
          </Card>

          {/* Infos document */}
          <Card>
            <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<Hash className="h-4 w-4" />} label="N° Facture">
                {isEditing ? (
                  <Input value={form.numeroFacture || ''} onChange={e => setForm(p => ({ ...p, numeroFacture: e.target.value }))} className="h-7 text-sm" />
                ) : <span className="font-medium">{form.numeroFacture || '—'}</span>}
              </InfoRow>
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Fournisseur">
                {isEditing ? (
                  <Input value={form.fournisseur || ''} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))} className="h-7 text-sm" />
                ) : <span className="font-medium">{form.fournisseur || '—'}</span>}
              </InfoRow>
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date">
                {isEditing ? (
                  <Input type="date" value={form.date || ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="h-7 text-sm" />
                ) : <span className="font-medium">{form.date || '—'}</span>}
              </InfoRow>
              {form.client && (
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Client">
                  {isEditing ? (
                    <Input value={form.client || ''} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} className="h-7 text-sm" />
                  ) : <span className="font-medium">{form.client}</span>}
                </InfoRow>
              )}
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Totaux</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Total HT</span>
                {isEditing ? (
                  <Input type="number" value={form.totalHT ?? ''} onChange={e => setForm(p => ({ ...p, totalHT: parseFloat(e.target.value) || 0 }))} className="h-7 w-32 text-sm text-right" />
                ) : <span className="font-medium">{fmt(form.totalHT)}</span>}
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">TVA</span>
                {isEditing ? (
                  <Input type="number" value={form.tva ?? ''} onChange={e => setForm(p => ({ ...p, tva: parseFloat(e.target.value) || 0 }))} className="h-7 w-32 text-sm text-right" />
                ) : <span className="font-medium">{fmt(form.tva)}</span>}
              </div>
              <div className="flex justify-between items-center py-2 border-t mt-1">
                <span className="font-semibold">Total TTC</span>
                {isEditing ? (
                  <Input type="number" value={form.totalTTC ?? ''} onChange={e => setForm(p => ({ ...p, totalTTC: parseFloat(e.target.value) || 0 }))} className="h-7 w-32 text-sm text-right font-bold" />
                ) : <span className="text-xl font-bold text-primary">{fmt(form.totalTTC)}</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Colonne droite : tableau produits ── */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" /> Tableau des produits
                {products.length > 0 && <Badge variant="outline" className="ml-1">{products.length} article{products.length > 1 ? 's' : ''}</Badge>}
              </CardTitle>
              {isEditing && <Button size="sm" variant="outline" onClick={addProduct}>+ Ajouter une ligne</Button>}
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun produit extrait</p>
                  {isEditing && <Button size="sm" variant="outline" className="mt-3" onClick={addProduct}>+ Ajouter un produit</Button>}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Produit</TableHead>
                      <TableHead className="text-right w-24">Quantité</TableHead>
                      <TableHead className="text-right w-32">Prix unitaire</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                      {isEditing && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((prod, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {isEditing ? (
                            <Input value={prod.nom} onChange={e => updateProduct(idx, 'nom', e.target.value)} className="h-7 text-sm" placeholder="Nom du produit" />
                          ) : <span className="font-medium">{prod.nom || '—'}</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input type="number" value={prod.quantite} onChange={e => updateProduct(idx, 'quantite', e.target.value)} className="h-7 text-sm text-right w-20 ml-auto" />
                          ) : prod.quantite}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input type="number" value={prod.prixUnitaire} onChange={e => updateProduct(idx, 'prixUnitaire', e.target.value)} className="h-7 text-sm text-right w-28 ml-auto" />
                          ) : fmt(prod.prixUnitaire)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmt(prod.total)}</TableCell>
                        {isEditing && (
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProduct(idx)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-muted/30">
                      <TableCell colSpan={isEditing ? 3 : 3} className="font-semibold text-right">Total</TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmt(products.reduce((s, p) => s + (p.total || 0), 0))}</TableCell>
                      {isEditing && <TableCell />}
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {form.rawText && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Texte OCR brut (extrait)</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto bg-muted/40 rounded p-3">{form.rawText}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Composant InfoRow ─────────────────────────────────────────
function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      {children}
    </div>
  )
}
