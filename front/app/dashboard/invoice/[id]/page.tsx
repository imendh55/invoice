'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, XCircle, Edit3, Save, X,
  FileText, Building2, Hash, Calendar, Package,
  ShieldCheck, AlertTriangle, Loader2, Download,
  Eye, ExternalLink, RefreshCw, Info, ChevronDown,
  ChevronUp, Sparkles, RotateCcw, ZoomIn, Cpu,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders } from '@/lib/api/config'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────
interface Produit {
  nom:          string
  quantite:     number
  prixUnitaire: number
  total:        number
}

interface ExtractedData {
  fournisseur?:         string
  numeroFacture?:       string
  date?:                string
  client?:              string
  adresseFournisseur?:  string
  adresseClient?:       string
  totalHT?:             number | null
  tva?:                 number | null
  totalTTC?:            number | null
  produits?:            Produit[]
  rawText?:             string
  confidence_score?:    number | null
  validation_errors?:   string[]
  validation_warnings?: string[]
}

interface Invoice {
  id:            number
  fileName:      string
  filePath:      string
  status:        string
  extractedData: ExtractedData
  validatedData: Record<string, any>
  total_ttc:     number | null
  createdAt:     string
}

// ─── Constantes ───────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  uploaded:  { label: 'Téléversée',  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',    icon: FileText    },
  extracted: { label: 'Extraite',    color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200', icon: Sparkles    },
  validated: { label: 'Validée',     color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  rejected:  { label: 'Rejetée',     color: 'text-red-600',     bg: 'bg-red-50 border-red-200',      icon: XCircle     },
}

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n?: number | null) =>
  n != null ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

const fmtDate = (d?: string) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch { return d }
}

function ConfidenceBadge({ score }: { score?: number | null }) {
  if (score == null) return null
  const pct   = Math.round(score * 100)
  const color = pct >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : pct >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
              :              'text-red-700 bg-red-50 border-red-200'
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium', color)}>
      <ShieldCheck className="h-4 w-4" />
      {pct >= 85 ? 'Haute confiance' : pct >= 60 ? 'Confiance moyenne' : 'Faible confiance'} — {pct}%
      <div className="ml-1 w-16 h-1.5 rounded-full bg-current/20 overflow-hidden">
        <div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Pipeline Steps ───────────────────────────────────────────
function PipelineSteps({ status }: { status: string }) {
  const steps = [
    { id: 'upload',     label: 'Téléversement', desc: 'Fichier reçu et vérifié' },
    { id: 'preprocess', label: 'Prétraitement',  desc: 'OpenCV — deskew, CLAHE, binarisation' },
    { id: 'ocr',        label: 'OCR / IA',       desc: 'Gemini Vision — extraction structurée' },
    { id: 'extract',    label: 'Structuration',  desc: 'Entités mappées vers le domaine' },
    { id: 'validate',   label: 'Validation',     desc: 'Confirmation utilisateur' },
  ]
  const doneMap: Record<string, number> = {
    uploaded: 1, extracted: 4, validated: 5, rejected: 5,
  }
  const done = doneMap[status] ?? 1

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const isComplete = i < done
        const isCurrent  = i === done - 1 && status !== 'validated' && status !== 'rejected'
        return (
          <div key={step.id} className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[90px]',
                    isCurrent && 'bg-primary/5',
                    !isComplete && 'opacity-40',
                  )}>
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                      isComplete && !isCurrent ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent ? 'bg-primary border-primary text-primary-foreground animate-pulse'
                        : 'border-muted-foreground/30 text-muted-foreground',
                    )}>
                      {isComplete && !isCurrent ? '✓' : i + 1}
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold text-center leading-tight whitespace-nowrap',
                      isCurrent ? 'text-primary' : isComplete ? 'text-emerald-600' : 'text-muted-foreground',
                    )}>
                      {step.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">{step.desc}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {i < steps.length - 1 && (
              <div className={cn('h-[2px] w-6 shrink-0 rounded-full', i < done - 1 ? 'bg-emerald-400' : 'bg-muted-foreground/20')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Editable Field ───────────────────────────────────────────
function EditableField({
  label, value, icon: Icon, editing, fieldKey,
  corrections, onChange, type = 'text',
}: {
  label: string; value?: string | number | null; icon: React.ElementType
  editing: boolean; fieldKey: string; corrections: Record<string, string>
  onChange: (k: string, v: string) => void; type?: string
}) {
  const display = value != null && value !== '' ? String(value) : '—'
  const current = corrections[fieldKey] ?? display
  return (
    <div className="group space-y-1">
      <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />{label}
      </Label>
      {editing ? (
        <Input
          type={type}
          value={current === '—' ? '' : current}
          onChange={e => onChange(fieldKey, e.target.value)}
          className="h-9 text-sm font-medium border-primary/50 focus:border-primary"
          placeholder={`Saisir ${label.toLowerCase()}...`}
        />
      ) : (
        <p className={cn('text-sm font-medium py-1.5 min-h-[36px]', display === '—' ? 'text-muted-foreground/50 italic' : '')}>
          {display}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function InvoicePage() {
  const params    = useParams()
  const router    = useRouter()
  const { token } = useAuth()
  const invoiceId = params?.id as string

  const [invoice,       setInvoice]       = useState<Invoice | null>(null)
  const [isLoading,     setIsLoading]     = useState(true)
  const [isEditing,     setIsEditing]     = useState(false)
  const [corrections,   setCorrections]   = useState<Record<string, string>>({})
  const [isSaving,      setIsSaving]      = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [showRaw,       setShowRaw]       = useState(false)
  const [imgZoomed,     setImgZoomed]     = useState(false)

  // ── Chargement ─────────────────────────────────────────────
  const loadInvoice = useCallback(async () => {
    if (!invoiceId || !token) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, { headers: getHeaders(token) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setInvoice(await res.json())
    } catch {
      toast.error('Impossible de charger la facture')
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId, token])

  useEffect(() => { loadInvoice() }, [loadInvoice])

  // ── Init corrections ────────────────────────────────────────
  useEffect(() => {
    if (!invoice) return
    const d = invoice.extractedData
    setCorrections({
      fournisseur:        d.fournisseur        ?? '',
      numeroFacture:      d.numeroFacture       ?? '',
      date:               d.date               ?? '',
      client:             d.client             ?? '',
      adresseFournisseur: d.adresseFournisseur  ?? '',
      adresseClient:      d.adresseClient       ?? '',
      totalHT:  d.totalHT  != null ? String(d.totalHT)  : '',
      tva:      d.tva      != null ? String(d.tva)       : '',
      totalTTC: d.totalTTC != null ? String(d.totalTTC)  : '',
    })
  }, [invoice])

  const handleChange = (k: string, v: string) => setCorrections(prev => ({ ...prev, [k]: v }))

  // ── Re-traiter (appel API /reprocess) ──────────────────────
  const handleReprocess = async () => {
    if (!invoice || !token) return
    setIsReprocessing(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/reprocess`, {
        method: 'POST',
        headers: getHeaders(token),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setInvoice(data.invoice)
      toast.success('✅ Re-traitement terminé')
    } catch (e: any) {
      toast.error(`Erreur re-traitement : ${e.message}`)
    } finally {
      setIsReprocessing(false)
    }
  }

  // ── Valider ─────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!invoice || !token) return
    setIsSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const [k, v] of Object.entries(corrections)) {
        if (v !== '' && v !== '—')
          payload[k] = ['totalHT', 'tva', 'totalTTC'].includes(k) ? parseFloat(v) || v : v
      }
      const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/validate`, {
        method: 'POST',
        headers: { ...getHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: payload }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInvoice(data.invoice)
      setIsEditing(false)
      toast.success('✅ Facture validée')
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Rejeter ──────────────────────────────────────────────────
  const handleReject = async () => {
    if (!invoice || !token) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/validate`, {
        method: 'POST',
        headers: { ...getHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: { _status: 'rejected' } }),
      })
      if (!res.ok) throw new Error()
      setInvoice((await res.json()).invoice)
      toast.success('Facture rejetée')
    } catch {
      toast.error('Erreur lors du rejet')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (!invoice) return
    const d = invoice.extractedData
    setCorrections({
      fournisseur:        d.fournisseur       ?? '',
      numeroFacture:      d.numeroFacture      ?? '',
      date:               d.date              ?? '',
      client:             d.client            ?? '',
      adresseFournisseur: d.adresseFournisseur ?? '',
      adresseClient:      d.adresseClient      ?? '',
      totalHT:  d.totalHT  != null ? String(d.totalHT)  : '',
      tva:      d.tva      != null ? String(d.tva)       : '',
      totalTTC: d.totalTTC != null ? String(d.totalTTC)  : '',
    })
    setIsEditing(false)
  }

  // ─── Chargement / Erreur ─────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-semibold">Chargement de la facture…</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-xl font-bold">Facture introuvable</p>
        <Button onClick={() => router.push('/dashboard/history')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour à l&apos;historique
        </Button>
      </div>
    )
  }

  const d         = invoice.extractedData
  const status    = invoice.status
  const cfg       = STATUS_CONFIG[status] ?? STATUS_CONFIG.uploaded
  const StatusIcon = cfg.icon
  const produits  = d.produits ?? []
  const isLocked  = status === 'validated' || status === 'rejected'
  const warnings  = d.validation_warnings ?? []
  const errors    = d.validation_errors   ?? []
  const imageUrl  = invoice.filePath
    ? `${API_BASE_URL.replace('/api', '')}/${invoice.filePath}`
    : null

  return (
    <div className="space-y-6 pb-12">

      {/* ── En-tête ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Retour
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={loadInvoice} disabled={isLoading || isReprocessing}>
              <RefreshCw className="h-4 w-4 mr-1.5" />Actualiser
            </Button>

            {/* ✅ Bouton Re-traiter — visible si statut = uploaded */}
            {status === 'uploaded' && (
              <Button
                size="sm"
                onClick={handleReprocess}
                disabled={isReprocessing}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isReprocessing
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Re-traitement…</>
                  : <><Cpu className="h-4 w-4 mr-1.5" />Re-traiter avec Gemini</>
                }
              </Button>
            )}

            <Button
              variant="outline" size="sm"
              onClick={() => window.open(`${API_BASE_URL}/invoices/export/csv`, '_blank')}
            >
              <Download className="h-4 w-4 mr-1.5" />Exporter CSV
            </Button>

            {!isLocked && (
              <>
                {!isEditing ? (
                  <Button size="sm" variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Edit3 className="h-4 w-4 mr-1.5" />Corriger
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <RotateCcw className="h-4 w-4 mr-1.5" />Annuler
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={handleReject} disabled={isSaving}>
                  <XCircle className="h-4 w-4 mr-1.5" />Rejeter
                </Button>
                <Button size="sm" onClick={handleValidate} disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  }
                  {isEditing ? 'Valider avec corrections' : 'Valider'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Titre + statut + pipeline */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{invoice.fileName}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  ID #{invoice.id} • {fmtDate(invoice.createdAt)}
                </span>
                <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold', cfg.bg, cfg.color)}>
                  <StatusIcon className="h-3.5 w-3.5" />{cfg.label}
                </div>
                <ConfidenceBadge score={d.confidence_score} />
              </div>
            </div>
          </div>

          {/* Bandeau d'alerte si Téléversée (extraction échouée) */}
          {status === 'uploaded' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  ⚠️ L&apos;extraction automatique n&apos;a pas abouti
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Cliquez sur &ldquo;Re-traiter avec Gemini&rdquo; pour relancer le pipeline OCR sur ce document.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleReprocess}
                disabled={isReprocessing}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isReprocessing
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />En cours…</>
                  : <><Cpu className="h-4 w-4 mr-1.5" />Re-traiter</>
                }
              </Button>
            </div>
          )}

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Pipeline de traitement
              </p>
              <PipelineSteps status={status} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Alertes validation ───────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-red-700 text-sm">
            <XCircle className="h-4 w-4" />Erreurs détectées
          </div>
          {errors.map((e, i) => <p key={i} className="text-xs text-red-600 ml-6">• {e}</p>)}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-amber-700 text-sm">
            <AlertTriangle className="h-4 w-4" />Avertissements
          </div>
          {warnings.map((w, i) => <p key={i} className="text-xs text-amber-600 ml-6">• {w}</p>)}
        </div>
      )}

      {/* ── Corps 2 colonnes ─────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Colonne gauche : aperçu document */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />Document original
              </CardTitle>
              <div className="flex items-center gap-2">
                {imageUrl && (
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => window.open(imageUrl, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setImgZoomed(!imgZoomed)}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={cn(
                  'relative bg-muted/30 flex items-center justify-center overflow-hidden cursor-zoom-in transition-all duration-300',
                  imgZoomed ? 'h-[600px]' : 'h-[340px]',
                )}
                onClick={() => setImgZoomed(!imgZoomed)}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl} alt={invoice.fileName}
                    className={cn('object-contain w-full h-full transition-transform duration-300', imgZoomed ? 'scale-100' : 'scale-95 hover:scale-100')}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                    <FileText className="h-16 w-16" />
                    <p className="text-sm">Aperçu non disponible</p>
                  </div>
                )}
                {isLocked && (
                  <div className={cn(
                    'absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold border',
                    status === 'validated' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600',
                  )}>
                    {status === 'validated' ? '✓ Validée' : '✕ Rejetée'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Texte brut OCR */}
          {d.rawText && (
            <Card>
              <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setShowRaw(!showRaw)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />Texte brut OCR
                  </CardTitle>
                  {showRaw ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {showRaw && (
                <CardContent>
                  <pre className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-auto max-h-52 leading-relaxed whitespace-pre-wrap font-mono">
                    {d.rawText}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Colonne droite : données extraites */}
        <div className="space-y-4">

          {/* Informations générales */}
          <Card className={cn(isEditing && 'ring-2 ring-primary/30 border-primary/30')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />Informations générales
                {isEditing && (
                  <Badge variant="outline" className="ml-auto text-primary border-primary text-[10px]">Mode édition</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <EditableField label="N° Facture"  value={d.numeroFacture} icon={Hash}      editing={isEditing} fieldKey="numeroFacture"      corrections={corrections} onChange={handleChange} />
              <EditableField label="Fournisseur" value={d.fournisseur}   icon={Building2} editing={isEditing} fieldKey="fournisseur"        corrections={corrections} onChange={handleChange} />
              <EditableField label="Date"        value={isEditing ? d.date : fmtDate(d.date)} icon={Calendar} editing={isEditing} fieldKey="date" type="date" corrections={corrections} onChange={handleChange} />
              <EditableField label="Client"      value={d.client}        icon={Building2} editing={isEditing} fieldKey="client"             corrections={corrections} onChange={handleChange} />
              {(d.adresseFournisseur || isEditing) && (
                <div className="sm:col-span-2">
                  <EditableField label="Adresse fournisseur" value={d.adresseFournisseur} icon={Building2} editing={isEditing} fieldKey="adresseFournisseur" corrections={corrections} onChange={handleChange} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Totaux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total HT', key: 'totalHT', val: d.totalHT },
                { label: 'TVA',      key: 'tva',     val: d.tva     },
              ].map(({ label, key, val }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {isEditing ? (
                    <Input type="number" step="0.01" value={corrections[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      className="h-8 w-36 text-right text-sm" />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">
                      {fmt(val)} {val != null ? 'DT' : ''}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-3 -mx-3">
                <span className="text-sm font-bold">Total TTC</span>
                {isEditing ? (
                  <Input type="number" step="0.01" value={corrections.totalTTC}
                    onChange={e => handleChange('totalTTC', e.target.value)}
                    className="h-8 w-36 text-right text-sm font-bold" />
                ) : (
                  <span className="text-base font-bold text-primary tabular-nums">
                    {fmt(d.totalTTC ?? invoice.total_ttc)} {(d.totalTTC ?? invoice.total_ttc) != null ? 'DT' : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Données validées */}
          {status === 'validated' && Object.keys(invoice.validatedData ?? {}).length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />Données validées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(invoice.validatedData).map(([k, v]) =>
                    v != null && v !== '' && (
                      <div key={k}>
                        <p className="text-[10px] font-semibold text-emerald-700/70 uppercase">{k}</p>
                        <p className="text-sm font-medium text-emerald-900">{String(v)}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Tableau des produits ─────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Tableau des produits
            {produits.length > 0 && (
              <Badge variant="secondary" className="text-xs">{produits.length} ligne{produits.length > 1 ? 's' : ''}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {produits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 border-2 border-dashed border-muted rounded-xl">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Aucun produit extrait automatiquement</p>
              <p className="text-xs text-muted-foreground/70 max-w-sm text-center">
                {status === 'uploaded'
                  ? 'Re-traitez la facture avec Gemini pour extraire les produits.'
                  : !isLocked && 'Cliquez sur "Corriger" pour ajouter les produits manuellement.'}
              </p>
              {status === 'uploaded' && (
                <Button size="sm" onClick={handleReprocess} disabled={isReprocessing}
                  className="bg-violet-600 hover:bg-violet-700 text-white">
                  {isReprocessing
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />En cours…</>
                    : <><Cpu className="h-4 w-4 mr-1.5" />Re-traiter</>
                  }
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Désignation</TableHead>
                    <TableHead className="text-center font-semibold">Qté</TableHead>
                    <TableHead className="text-right font-semibold">Prix unitaire</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produits.map((p, i) => (
                    <TableRow key={i} className="hover:bg-muted/20">
                      <TableCell className="font-medium max-w-[260px]">
                        <span className="line-clamp-2">{p.nom || '—'}</span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">{p.quantite ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(p.prixUnitaire)} DT</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{fmt(p.total)} DT</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t bg-muted/20 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Sous-total :{' '}
                  <span className="font-semibold text-foreground">
                    {fmt(produits.reduce((s, p) => s + (p.total ?? 0), 0))} DT
                  </span>
                </span>
                {d.totalTTC != null && (
                  <span className="text-xs text-muted-foreground">
                    Total TTC : <span className="font-bold text-primary">{fmt(d.totalTTC)} DT</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Barre flottante mode édition ─────────────────────── */}
      {isEditing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm border shadow-2xl rounded-2xl px-5 py-3">
            <Edit3 className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">Mode correction actif</span>
            <Separator orientation="vertical" className="h-5" />
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-1.5" />Annuler
            </Button>
            <Button size="sm" onClick={handleValidate} disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Enregistrer et valider
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
