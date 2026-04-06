'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FileText, Check, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import * as invoicesApi from '@/lib/api/invoices'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ProcessingPage() {
  const router = useRouter()
  const params = useParams()
  const { token } = useAuth()
  const invoiceId = params.id as string

  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'processing' | 'complete' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!invoiceId || !token) return

    let interval: NodeJS.Timeout

    const simulateProcessing = async () => {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 12, 100)

          if (newProgress >= 100) {
            clearInterval(interval)
            setStatus('complete')
            // Redirection vers la page de résultat
            setTimeout(() => {
              router.push(`/dashboard/invoice/${invoiceId}`)
            }, 800)
          }
          return newProgress
        })
      }, 180)
    }

    simulateProcessing()

    return () => clearInterval(interval)
  }, [invoiceId, token, router])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Erreur lors du traitement</h2>
        <p className="text-muted-foreground mt-2">{errorMessage}</p>
        <Button onClick={() => router.push('/dashboard/import')} className="mt-6">
          Retourner à l'import
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Traitement de la facture</h1>
        <p className="text-muted-foreground mt-2">ID facture : <span className="font-mono">{invoiceId}</span></p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Extraction des données par OCR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Barre de progression */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progression du traitement</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Étapes */}
          <div className="space-y-4">
            {[
              { label: 'Prétraitement de l’image', progress: 25 },
              { label: 'OCR (reconnaissance de texte)', progress: 50 },
              { label: 'Analyse intelligente des champs', progress: 70 },
              { label: 'Extraction des tableaux produits', progress: 85 },
              { label: 'Calcul du score de confiance', progress: 100 },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                  progress >= step.progress ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {progress >= step.progress ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn(
                  progress >= step.progress ? 'line-through text-muted-foreground' : 'font-medium'
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {progress < 100 ? 'Le traitement est en cours…' : 'Traitement terminé ! Redirection...'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}