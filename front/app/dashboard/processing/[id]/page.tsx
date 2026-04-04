'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FileText, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'processing' | 'complete'
}

export default function ProcessingPage() {
  const router = useRouter()
  const params = useParams()
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', label: 'Prétraitement de l\'image', status: 'pending' },
    { id: '2', label: 'Extraction OCR', status: 'pending' },
    { id: '3', label: 'Analyse intelligente (IA)', status: 'pending' },
    { id: '4', label: 'Détection tableaux', status: 'pending' },
    { id: '5', label: 'Score de confiance', status: 'pending' },
  ])

  useEffect(() => {
    // Simulate OCR processing
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2
        
        // Update steps based on progress
        setSteps(currentSteps => {
          const updatedSteps = [...currentSteps]
          if (newProgress >= 20 && updatedSteps[0].status !== 'complete') {
            updatedSteps[0] = { ...updatedSteps[0], status: 'complete' }
            updatedSteps[1] = { ...updatedSteps[1], status: 'processing' }
          }
          if (newProgress >= 40 && updatedSteps[1].status !== 'complete') {
            updatedSteps[1] = { ...updatedSteps[1], status: 'complete' }
            updatedSteps[2] = { ...updatedSteps[2], status: 'processing' }
          }
          if (newProgress >= 60 && updatedSteps[2].status !== 'complete') {
            updatedSteps[2] = { ...updatedSteps[2], status: 'complete' }
            updatedSteps[3] = { ...updatedSteps[3], status: 'processing' }
          }
          if (newProgress >= 80 && updatedSteps[3].status !== 'complete') {
            updatedSteps[3] = { ...updatedSteps[3], status: 'complete' }
            updatedSteps[4] = { ...updatedSteps[4], status: 'processing' }
          }
          if (newProgress >= 100 && updatedSteps[4].status !== 'complete') {
            updatedSteps[4] = { ...updatedSteps[4], status: 'complete' }
          }
          return updatedSteps
        })

        if (newProgress >= 100) {
          clearInterval(interval)
          // Redirect to results after completion
          setTimeout(() => {
            router.push(`/dashboard/invoice/INV-001`)
          }, 1000)
          return 100
        }
        return newProgress
      })
    }, 150)

    // Start first step
    setSteps(prev => {
      const updated = [...prev]
      updated[0] = { ...updated[0], status: 'processing' }
      return updated
    })

    return () => clearInterval(interval)
  }, [router, params.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traitement OCR</h1>
        <p className="text-muted-foreground">Extraction des données de votre facture en cours...</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Document Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document en cours de traitement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">facture1.pdf</p>
                <p className="text-xs text-muted-foreground mt-1">Statut: en cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Progression du traitement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      step.status === 'complete' && 'border-success bg-success text-success-foreground',
                      step.status === 'processing' && 'border-primary bg-primary/10',
                      step.status === 'pending' && 'border-muted-foreground/30'
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
                      'text-sm font-medium',
                      step.status === 'complete' && 'text-success',
                      step.status === 'processing' && 'text-primary',
                      step.status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Status Message */}
            <div className="rounded-lg bg-muted p-4 text-center">
              {progress < 100 ? (
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
