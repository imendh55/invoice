'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, File, Loader2, CheckCircle2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getUploadHeaders } from '@/lib/api/config'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────
interface UploadedFile {
  localId: string        // ID temporaire local (avant upload)
  serverId?: number      // ID réel retourné par le backend
  name: string
  size: string
  date: string
  status: 'en_attente' | 'uploading' | 'uploaded' | 'error'
  file?: File            // Fichier brut (présent avant upload)
}

const STATUS_COLORS: Record<UploadedFile['status'], string> = {
  en_attente: 'bg-muted text-muted-foreground',
  uploading:  'bg-blue-500 text-white',
  uploaded:   'bg-success text-success-foreground',
  error:      'bg-destructive text-destructive-foreground',
}

const STATUS_LABELS: Record<UploadedFile['status'], string> = {
  en_attente: 'En attente',
  uploading:  'Upload...',
  uploaded:   'Uploadé ✓',
  error:      'Erreur',
}

// ── Helpers ───────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const ACCEPTED_TYPES = ['.pdf', '.jpg', '.jpeg', '.png']
const MAX_SIZE_MB = 10

// ── Composant principal ───────────────────────────────────────
export default function ImportPage() {
  const router      = useRouter()
  const { token }   = useAuth()

  const [isDragging,    setIsDragging]    = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading,   setIsUploading]   = useState(false)

  // ── Ajout de fichiers à la liste locale ──────────────────
  const addFiles = useCallback((rawFiles: File[]) => {
    const valid: UploadedFile[] = []

    for (const f of rawFiles) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED_TYPES.includes(ext)) {
        toast.error(`Format non supporté : ${f.name}`)
        continue
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`Fichier trop grand (max ${MAX_SIZE_MB} MB) : ${f.name}`)
        continue
      }
      valid.push({
        localId: `local-${Date.now()}-${Math.random()}`,
        name:    f.name,
        size:    formatFileSize(f.size),
        date:    new Date().toLocaleDateString('fr-FR'),
        status:  'en_attente',
        file:    f,
      })
    }

    if (valid.length > 0) {
      setUploadedFiles(prev => [...valid, ...prev])
    }
  }, [])

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true)  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = '' // reset pour permettre re-sélection du même fichier
  }, [addFiles])

  // ── Upload d'un seul fichier → retourne l'ID serveur ─────
  const uploadOne = async (localFile: UploadedFile): Promise<number | null> => {
    if (!token || !localFile.file) return null

    // Passer en "uploading"
    setUploadedFiles(prev =>
      prev.map(f => f.localId === localFile.localId ? { ...f, status: 'uploading' } : f)
    )

    try {
      const formData = new FormData()
      formData.append('file', localFile.file)

      const res = await fetch(`${API_BASE_URL}/invoices/upload`, {
        method:  'POST',
        headers: getUploadHeaders(token),
        body:    formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Erreur serveur')
      }

      const data = await res.json()
      const serverId: number = data.id

      // Mettre à jour avec l'ID serveur réel
      setUploadedFiles(prev =>
        prev.map(f =>
          f.localId === localFile.localId
            ? { ...f, status: 'uploaded', serverId, file: undefined }
            : f
        )
      )

      toast.success(`${localFile.name} uploadé avec succès`)
      return serverId

    } catch (err: any) {
      setUploadedFiles(prev =>
        prev.map(f => f.localId === localFile.localId ? { ...f, status: 'error' } : f)
      )
      toast.error(`Échec upload : ${err.message || localFile.name}`)
      return null
    }
  }

  // ── Upload tout + rediriger vers processing du premier ───
  const uploadAllAndProcess = async () => {
    const pending = uploadedFiles.filter(f => f.file && f.status === 'en_attente')
    if (pending.length === 0) { toast.info('Aucun fichier en attente'); return }

    setIsUploading(true)
    const ids: number[] = []

    for (const f of pending) {
      const id = await uploadOne(f)
      if (id !== null) ids.push(id)
    }

    setIsUploading(false)

    // Rediriger vers la page processing du premier fichier uploadé avec succès
    if (ids.length > 0) {
      router.push(`/dashboard/processing/${ids[0]}`)
    }
  }

  // ── Traiter / uploader un fichier individuel ─────────────
  const handleProcess = async (localId: string) => {
    const f = uploadedFiles.find(f => f.localId === localId)
    if (!f) return

    // Si déjà uploadé → aller directement à processing
    if (f.status === 'uploaded' && f.serverId) {
      router.push(`/dashboard/processing/${f.serverId}`)
      return
    }

    // Sinon uploader d'abord
    const serverId = await uploadOne(f)
    if (serverId !== null) {
      router.push(`/dashboard/processing/${serverId}`)
    }
  }

  // ── Supprimer un fichier ─────────────────────────────────
  const removeFile = async (localId: string) => {
    const f = uploadedFiles.find(f => f.localId === localId)
    if (!f) return

    // Si le fichier est sur le serveur, supprimer via API
    if (f.serverId && token) {
      try {
        await fetch(`${API_BASE_URL}/invoices/${f.serverId}`, {
          method:  'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // Non bloquant
      }
    }
    setUploadedFiles(prev => prev.filter(f => f.localId !== localId))
  }

  const pendingCount  = uploadedFiles.filter(f => f.file && f.status === 'en_attente').length
  const uploadedCount = uploadedFiles.filter(f => f.status === 'uploaded').length

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer des factures</h1>
        <p className="text-muted-foreground">
          Importez vos factures PDF ou images pour les traiter par OCR
        </p>
      </div>

      {/* Zone de dépôt */}
      <Card>
        <CardHeader>
          <CardTitle>Zone d&apos;import</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-14 transition-all duration-200',
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            <div className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full mb-4 transition-colors',
              isDragging ? 'bg-primary/20' : 'bg-primary/10'
            )}>
              <Upload className={cn('h-8 w-8 transition-colors', isDragging ? 'text-primary' : 'text-primary/70')} />
            </div>

            <p className="text-lg font-semibold mb-1">
              {isDragging ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos factures'}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              ou cliquez pour sélectionner depuis votre ordinateur
            </p>

            {/* Input invisible par-dessus toute la zone */}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 cursor-pointer opacity-0"
            />

            <Button variant="outline" className="pointer-events-none">
              <FileText className="mr-2 h-4 w-4" />
              Parcourir les fichiers
            </Button>

            <p className="mt-4 text-xs text-muted-foreground">
              Formats acceptés : PDF, JPG, JPEG, PNG &nbsp;•&nbsp; Taille max : {MAX_SIZE_MB} MB par fichier
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des fichiers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fichiers importés</CardTitle>
            {uploadedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {pendingCount} en attente · {uploadedCount} uploadé{uploadedCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {pendingCount > 0 && (
            <Button onClick={uploadAllAndProcess} disabled={isUploading} size="sm">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader et traiter ({pendingCount})
                </>
              )}
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {uploadedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <File className="h-14 w-14 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Aucun fichier importé</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Glissez vos factures ou cliquez sur &quot;Parcourir&quot;
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du fichier</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedFiles.map((file) => (
                  <TableRow key={file.localId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[220px]">{file.name}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">{file.size}</TableCell>
                    <TableCell className="text-muted-foreground">{file.date}</TableCell>

                    <TableCell>
                      <Badge className={STATUS_COLORS[file.status]}>
                        {file.status === 'uploading' && (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {file.status === 'uploaded' && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {STATUS_LABELS[file.status]}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Bouton Uploader / Traiter */}
                        {(file.status === 'en_attente' || file.status === 'uploaded') && (
                          <Button
                            size="sm"
                            variant={file.status === 'uploaded' ? 'default' : 'outline'}
                            onClick={() => handleProcess(file.localId)}
                            disabled={isUploading}
                          >
                            {file.status === 'uploaded' ? 'Traiter' : 'Uploader'}
                          </Button>
                        )}

                        {/* Réessayer si erreur */}
                        {file.status === 'error' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/50"
                            onClick={() => handleProcess(file.localId)}
                          >
                            Réessayer
                          </Button>
                        )}

                        {/* Supprimer */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(file.localId)}
                          disabled={file.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
