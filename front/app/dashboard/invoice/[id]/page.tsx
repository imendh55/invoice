'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, ArrowLeft, CheckCircle, XCircle, Save,
  Loader2, AlertCircle, Building2, Calendar, Hash,
  Receipt, Package, Edit3, RotateCcw, ExternalLink, ImageOff
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders } from '@/lib/api/config'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────
interface Product {
  nom:          string
  quantite:     number
  prixUnitaire: number
  total:        number
}

interface ExtractedData {
  numeroFacture?:  string
  invoice_number?: string
  fournisseur?:    string
  supplier?:       string
  client?:         string
  date?:           string
  totalHT?:        number | null
  total_ht?:       number | null
  tva?:            number | null
  total_tva?:      number | null
  totalTTC?:       number | null
  total_ttc?:      number | null
  produits?:       Product[]
  rawText?:        string
  raw_text?:       string
}

interface InvoiceDetail {
  id:             number
  fileName:       string
  filePath?:      string
  status:         string
  extractedData:  ExtractedData
  validatedData?: ExtractedData
  total_ttc?:     number | null
  createdAt?:     string
}

// ── Statuts ───────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  uploaded:  { label: 'Uploadée',  color: 'bg-blue-500/15 text-blue-600' },
  extracted: { label: 'Extraite',  color: 'bg-purple-500/15 text-purple-600' },
  validated: { label: 'Validée',   color: 'bg-green-500/15 text-green-600' },
  rejected:  { label: 'Rejetée',   color: 'bg-red-500/15 text-red-600' },
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(v?: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

function normalize(raw: ExtractedData) {
  return {
    numeroFacture: raw.numeroFacture || raw.invoice_number || '',
    fournisseur:   raw.fournisseur   || raw.supplier       || '',
    client:        raw.client        || '',
    date:          raw.date          || '',
    totalHT:       raw.totalHT       ?? raw.total_ht       ?? null,
    tva:           raw.tva           ?? raw.total_tva      ?? null,
    totalTTC:      raw.totalTTC      ?? raw.total_ttc      ?? null,
    // ✅ Produits — source unique
    produits:      (raw.produits || []) as Product[],
    rawText:       raw.rawText || raw.raw_text || '',
  }
}

type FormState = ReturnType<typeof normalize>

// ── URL image backend ─────────────────────────────────────────
const BACKEND = 'http://localhost:8000'

function getImageUrl(filePath?: string): string | null {
  if (!filePath) return null
  // filePath = "uploads/1234567_facture.png"
  return `${BACKEND}/${filePath}`
}

// ── Composant principal ───────────────────────────────────────
export default function InvoiceDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const { token } = useAuth()
  const invoiceId = params?.id as string | undefined

  const [invoice,          setInvoice]          = useState<InvoiceDetail | null>(null)
  const [isLoading,        setIsLoading]        = useState(true)
  const [hasError,         setHasError]         = useState(false)
  const [isEditing,        setIsEditing]        = useState(false)
  const [isSaving,         setIsSaving]         = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [form,             setForm]             = useState<FormState | null>(null)
  const [products,         setProducts]         = useState<Product[]>([])
  const [imgError,         setImgError]         = useState(false)
  const [imgLoaded,        setImgLoaded]        = useState(false)

  // ── Chargement ──────────────────────────────────────────────
  useEffect(() => {
    if (!invoiceId || !token) return
    const load = async () => {
      setIsLoading(true)
      try {
        const res  = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, { headers: getHeaders(token) })
        if (!res.ok) throw new Error()
        const data: InvoiceDetail = await res.json()
        setInvoice(data)
        const n = normalize(data.extractedData || {})
        setForm(n)
        setProducts(n.produits)
        setImgError(false)
        setImgLoaded(false)
      } catch { setHasError(true) }
      finally  { setIsLoading(false) }
    }
    load()
  }, [invoiceId, token])

  // ── Recalcul totaux ─────────────────────────────────────────
  const recalc = (prods: Product[]) => {
    const ht  = Math.round(prods.reduce((s, p) => s + (p.total || 0), 0) * 100) / 100
    const tva = form?.tva != null ? form.tva : Math.round(ht * 0.2 * 100) / 100
    setForm(prev => prev ? { ...prev, totalHT: ht, tva, totalTTC: Math.round((ht + tva) * 100) / 100 } : prev)
  }

  const updateProduct = (idx: number, field: keyof Product, value: string) => {
    setProducts(prev => {
      const u = [...prev]; const p = { ...u[idx] }
      if (field === 'nom') { p.nom = value }
      else {
        const n = parseFloat(value) || 0; (p as any)[field] = n
        if (field === 'quantite' || field === 'prixUnitaire')
          p.total = Math.round(p.quantite * p.prixUnitaire * 100) / 100
      }
      u[idx] = p; recalc(u); return u
    })
  }

  const addProduct    = () => { const u = [...products, { nom: '', quantite: 1, prixUnitaire: 0, total: 0 }]; setProducts(u); recalc(u) }
  const removeProduct = (i: number) => { const u = products.filter((_, j) => j !== i); setProducts(u); recalc(u) }
  const resetEdit     = () => {
    if (!invoice) return
    const n = normalize(invoice.extractedData || {})
    setForm(n); setProducts(n.produits); setIsEditing(false)
  }

  // ── Valider ─────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!token || !invoiceId || !form) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/validate`, {
        method: 'POST', headers: getHeaders(token),
        body: JSON.stringify({ corrections: { ...form, produits: products } }),
      })
      if (!res.ok) throw new Error()
      setInvoice(prev => prev ? { ...prev, status: 'validated' } : prev)
      setIsEditing(false)
      toast.success('✅ Facture validée avec succès !')
    } catch { toast.error('Erreur lors de la validation') }
    finally  { setIsSaving(false) }
  }

  // ── Rejeter ─────────────────────────────────────────────────
  const handleReject = async () => {
    if (!token || !invoiceId) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/validate`, {
        method: 'POST', headers: getHeaders(token),
        body: JSON.stringify({ corrections: { _status: 'rejected' } }),
      })
      if (!res.ok) throw new Error()
      setInvoice(prev => prev ? { ...prev, status: 'rejected' } : prev)
      setShowRejectDialog(false)
      toast.success('Facture rejetée')
      setTimeout(() => router.push('/dashboard/history'), 1500)
    } catch { toast.error('Erreur lors du rejet') }
    finally  { setIsSaving(false) }
  }

  // ── Image URL ────────────────────────────────────────────────
  const imageUrl  = invoice?.filePath ? getImageUrl(invoice.filePath) : null
  const isImage   = !!imageUrl && /\.(png|jpg|jpeg|gif|webp)$/i.test(imageUrl)
  const isPdf     = !!imageUrl && /\.pdf$/i.test(imageUrl)

  // ── États chargement ─────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )

  if (hasError || !invoice || !form) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-lg font-medium">Facture introuvable</p>
      <Button onClick={() => router.push('/dashboard/history')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
    </div>
  )

  const statusCfg = STATUS_CFG[invoice.status] ?? { label: invoice.status, color: 'bg-muted text-muted-foreground' }
  const canEdit   = invoice.status !== 'validated' && invoice.status !== 'rejected'
  const totalRows = Math.round(products.reduce((s, p) => s + (p.total || 0), 0) * 100) / 100

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 max-w-[500px] truncate">
              <FileText className="h-5 w-5 text-primary shrink-0" />
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

        {/* Boutons */}
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={resetEdit} disabled={isSaving}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Annuler
                </Button>
                <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={isSaving}
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
                <Button variant="outline" onClick={() => setShowRejectDialog(true)}
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
        {!canEdit && (
          <Badge className={`${statusCfg.color} text-sm px-3 py-1`}>
            {invoice.status === 'validated' ? '✅ Validée' : '❌ Rejetée'}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">

        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-4">

          {/* ✅ DOCUMENT ORIGINAL — Affichage réel de l'image */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Document original</CardTitle>
              {imageUrl && (
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" title="Ouvrir dans un nouvel onglet">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
            </CardHeader>
            <CardContent className="p-3 pt-0">

              {/* Image réelle depuis le backend */}
              {isImage && imageUrl && !imgError ? (
                <div className="rounded-lg overflow-hidden border bg-muted relative">
                  {/* Placeholder pendant le chargement */}
                  {!imgLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    </div>
                  )}
                  <img
                    src={imageUrl}
                    alt={invoice.fileName}
                    className="w-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
                    style={{ maxHeight: '520px', display: imgLoaded ? 'block' : 'block' }}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => { setImgError(true); setImgLoaded(true) }}
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                </div>
              ) : isPdf ? (
                // PDF — lien de téléchargement
                <div
                  className="aspect-[3/4] rounded-lg bg-muted border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors group"
                  onClick={() => imageUrl && window.open(imageUrl, '_blank')}
                >
                  <FileText className="h-16 w-16 text-red-400/70 group-hover:text-red-500 mb-3 transition-colors" />
                  <p className="text-sm font-medium text-center px-4 truncate max-w-full">{invoice.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-2">Cliquez pour ouvrir le PDF</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={e => { e.stopPropagation(); window.open(imageUrl!, '_blank') }}>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Ouvrir le PDF
                  </Button>
                </div>
              ) : (
                // Erreur image ou pas d'URL
                <div className="aspect-[3/4] rounded-lg bg-muted border flex flex-col items-center justify-center">
                  {imgError ? (
                    <>
                      <ImageOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Image non disponible</p>
                      {imageUrl && (
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => window.open(imageUrl, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Essayer en direct
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <FileText className="h-14 w-14 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">{invoice.fileName}</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations générales */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<Hash className="h-4 w-4" />} label="N° Facture">
                {isEditing
                  ? <Input value={form.numeroFacture} onChange={e => setForm(p => p ? { ...p, numeroFacture: e.target.value } : p)} className="h-7 text-sm" />
                  : <span className="font-medium text-sm">{form.numeroFacture || '—'}</span>}
              </InfoRow>
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Fournisseur">
                {isEditing
                  ? <Input value={form.fournisseur} onChange={e => setForm(p => p ? { ...p, fournisseur: e.target.value } : p)} className="h-7 text-sm" />
                  : <span className="font-medium text-sm">{form.fournisseur || '—'}</span>}
              </InfoRow>
              {(form.client || isEditing) && (
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Client">
                  {isEditing
                    ? <Input value={form.client} onChange={e => setForm(p => p ? { ...p, client: e.target.value } : p)} className="h-7 text-sm" />
                    : <span className="font-medium text-sm">{form.client}</span>}
                </InfoRow>
              )}
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date">
                {isEditing
                  ? <Input type="date" value={form.date} onChange={e => setForm(p => p ? { ...p, date: e.target.value } : p)} className="h-7 text-sm" />
                  : <span className="font-medium text-sm">{form.date || '—'}</span>}
              </InfoRow>
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Totaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                {isEditing
                  ? <Input type="number" value={form.totalHT ?? ''} onChange={e => setForm(p => p ? { ...p, totalHT: parseFloat(e.target.value) || 0 } : p)} className="h-7 w-32 text-right text-sm" />
                  : <span className="font-medium">{fmt(form.totalHT)}</span>}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA</span>
                {isEditing
                  ? <Input type="number" value={form.tva ?? ''} onChange={e => setForm(p => p ? { ...p, tva: parseFloat(e.target.value) || 0 } : p)} className="h-7 w-32 text-right text-sm" />
                  : <span className="font-medium">{fmt(form.tva)}</span>}
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total TTC</span>
                {isEditing
                  ? <Input type="number" value={form.totalTTC ?? ''} onChange={e => setForm(p => p ? { ...p, totalTTC: parseFloat(e.target.value) || 0 } : p)} className="h-7 w-32 text-right font-bold" />
                  : <span className="text-xl font-bold text-primary">{fmt(form.totalTTC)}</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-3 space-y-4">

          {/* ✅ TABLEAU DES PRODUITS — automatique depuis OCR */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tableau des produits
                {products.length > 0 && (
                  <Badge variant="outline">{products.length} article{products.length > 1 ? 's' : ''}</Badge>
                )}
              </CardTitle>
              {isEditing && (
                <Button size="sm" variant="outline" onClick={addProduct}>
                  + Ajouter une ligne
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Aucun produit extrait automatiquement</p>
                  <p className="text-xs mt-1 max-w-xs mx-auto">
                    L&apos;OCR n&apos;a pas détecté de tableau structuré. Utilisez &quot;Corriger&quot; pour ajouter les produits manuellement.
                  </p>
                  {isEditing && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={addProduct}>
                      + Ajouter manuellement
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="pl-4">Produit / Désignation</TableHead>
                      <TableHead className="text-right w-24">Qté</TableHead>
                      <TableHead className="text-right w-32">Prix unitaire</TableHead>
                      <TableHead className="text-right w-28 pr-4">Total</TableHead>
                      {isEditing && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((prod, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="pl-4">
                          {isEditing
                            ? <Input value={prod.nom} onChange={e => updateProduct(idx, 'nom', e.target.value)} className="h-7 text-sm" />
                            : <span className="font-medium text-sm">{prod.nom || '—'}</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing
                            ? <Input type="number" value={prod.quantite} onChange={e => updateProduct(idx, 'quantite', e.target.value)} className="h-7 text-sm text-right w-20 ml-auto" />
                            : <span className="text-sm">{prod.quantite}</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing
                            ? <Input type="number" value={prod.prixUnitaire} onChange={e => updateProduct(idx, 'prixUnitaire', e.target.value)} className="h-7 text-sm text-right w-28 ml-auto" />
                            : <span className="text-sm">{fmt(prod.prixUnitaire)}</span>}
                        </TableCell>
                        <TableCell className="text-right pr-4 font-semibold text-sm">{fmt(prod.total)}</TableCell>
                        {isEditing && (
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeProduct(idx)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}

                    {/* Ligne total */}
                    <TableRow className="border-t-2 bg-muted/40 font-semibold">
                      <TableCell colSpan={2} className="pl-4 text-sm">
                        Total des produits
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {products.length} ligne{products.length > 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-right pr-4 font-bold text-primary">
                        {fmt(totalRows)}
                      </TableCell>
                      {isEditing && <TableCell />}
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Texte OCR brut */}
          {form.rawText && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Texte OCR brut (extrait)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-56 overflow-y-auto bg-muted/40 rounded-lg p-3 leading-relaxed">
                  {form.rawText}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogue rejet */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Rejeter la facture
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirmez-vous le rejet de cette facture ? Elle sera marquée comme rejetée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleReject} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── InfoRow ───────────────────────────────────────────────────
function InfoRow({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
