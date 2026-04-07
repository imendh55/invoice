'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FileText, Check, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders } from '@/lib/api/config'

interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'processing' | 'complete'
}

const INITIAL_STEPS: ProcessingStep[] = [
  { id: '1', label: "Prétraitement de l'image",  status: 'pending' },
  { id: '2', label: 'Extraction OCR',             status: 'pending' },
  { id: '3', label: 'Analyse intelligente (IA)',  status: 'pending' },
  { id: '4', label: 'Détection tableaux',         status: 'pending' },
  { id: '5', label: 'Score de confiance',         status: 'pending' },
]

// Seuils de progression pour chaque étape (%)
const STEP_THRESHOLDS = [20, 40, 60, 80, 100]

export default function ProcessingPage() {
  const router   = useRouter()
  const params   = useParams()
  const { token } = useAuth()

  // ── Récupération de l'ID réel depuis les params ──────────
  const invoiceId = params?.id as string | undefined

  const [progress, setProgress]   = useState(0)
  const [steps, setSteps]         = useState<ProcessingStep[]>(INITIAL_STEPS)
  const [filename, setFilename]   = useState<string>('Facture en cours...')
  const [hasError, setHasError]   = useState(false)
  const [done, setDone]           = useState(false)

  // ── Charger le nom du fichier depuis l'API ────────────────
  useEffect(() => {
    if (!invoiceId || !token) return

    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
          headers: getHeaders(token),
        })
        if (res.ok) {
          const data = await res.json()
          setFilename(data.fileName || data.filename || `Facture #${invoiceId}`)
        }
      } catch {
        // Non bloquant — on affiche juste l'ID
        setFilename(`Facture #${invoiceId}`)
      }
    }

    fetchInvoice()
  }, [invoiceId, token])

  // ── Simulation du traitement OCR avec barre de progression ─
  useEffect(() => {
    if (!invoiceId) {
      setHasError(true)
      return
    }

    // Démarrer la première étape
    setSteps((prev) => {
      const updated = [...prev]
      updated[0] = { ...updated[0], status: 'processing' }
      return updated
    })

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2

        // Mettre à jour les étapes selon la progression
        setSteps((currentSteps) => {
          const updated = [...currentSteps]

          STEP_THRESHOLDS.forEach((threshold, idx) => {
            if (next >= threshold && updated[idx].status !== 'complete') {
              updated[idx] = { ...updated[idx], status: 'complete' }
              // Démarrer l'étape suivante si elle existe
              if (idx + 1 < updated.length) {
                updated[idx + 1] = { ...updated[idx + 1], status: 'processing' }
              }
            }
          })

          return updated
        })

        if (next >= 100) {
          clearInterval(interval)
          setDone(true)
          // ✅ Redirection vers la vraie page facture avec l'ID réel
          setTimeout(() => {
            router.push(`/dashboard/invoice/${invoiceId}`)
          }, 1200)
          return 100
        }

        return next
      })
    }, 150)

    return () => clearInterval(interval)
  }, [invoiceId, router])

  // ── Gestion d'erreur : ID manquant ───────────────────────
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">ID de facture manquant</p>
        <p className="text-sm text-muted-foreground">
          Impossible de démarrer le traitement sans identifiant de facture.
        </p>
        <Button onClick={() => router.push('/dashboard/import')}>
          Retour à l&apos;import
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traitement OCR</h1>
        <p className="text-muted-foreground">
          Extraction des données de votre facture en cours...
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Aperçu du document ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document en cours de traitement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center px-4">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground/80 truncate max-w-[200px] mx-auto">
                  {filename}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ID : #{invoiceId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Statut : en cours de traitement
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Progression du traitement ────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Progression du traitement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Étapes */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300',
                      step.status === 'complete'   && 'border-success bg-success text-success-foreground',
                      step.status === 'processing' && 'border-primary bg-primary/10',
                      step.status === 'pending'    && 'border-muted-foreground/30'
                    )}
                  >
                    {step.status === 'complete' ? (
                      <Check className="h-4 w-4" />
                    ) : step.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors',
                      step.status === 'complete'   && 'text-success',
                      step.status === 'processing' && 'text-primary',
                      step.status === 'pending'    && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Message de statut */}
            <div className="rounded-lg bg-muted p-4 text-center">
              {!done ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Veuillez patienter...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le traitement peut prendre quelques secondes
                  </p>
                </>
              ) : (
                <>
                  <Check className="h-6 w-6 mx-auto mb-2 text-success" />
                  <p className="text-sm font-medium text-success">Traitement terminé !</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Redirection vers les résultats...
                  </p>
                </>
              )}
            </div>

            {/* Bouton d'accès anticipé */}
            {invoiceId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/dashboard/invoice/${invoiceId}`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Voir la facture maintenant
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
