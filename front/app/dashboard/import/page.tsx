'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, File, Loader2 } from 'lucide-react'
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
import * as invoicesApi from '@/lib/api/invoices'
import { toast } from 'sonner'

interface UploadedFile {
  id: string | number
  name: string
  size: string
  date: string
  status: 'uploading' | 'en_cours' | 'en_attente' | 'complete' | 'error'
  file?: File
}

const statusColors = {
  uploading: 'bg-blue-500 text-white',
  en_cours: 'bg-warning text-warning-foreground',
  en_attente: 'bg-muted text-muted-foreground',
  complete: 'bg-success text-success-foreground',
  error: 'bg-destructive text-destructive-foreground',
}

const statusLabels = {
  uploading: 'Upload...',
  en_cours: 'En cours',
  en_attente: 'En attente',
  complete: 'Terminé',
  error: 'Erreur',
}

export default function ImportPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      processFiles(files)
    }
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const processFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      name: file.name,
      size: formatFileSize(file.size),
      date: new Date().toLocaleDateString('fr-FR'),
      status: 'en_attente' as const,
      file: file,
    }))
    
    setUploadedFiles(prev => [...newFiles, ...prev])
  }

  // Upload un fichier vers le backend
  const uploadFile = async (localFile: UploadedFile) => {
    if (!token || !localFile.file) return

    // Mettre à jour le statut en "uploading"
    setUploadedFiles(prev => 
      prev.map(f => f.id === localFile.id ? { ...f, status: 'uploading' as const } : f)
    )

    try {
      const response = await invoicesApi.uploadInvoice(localFile.file, token)
      
      // Remplacer le fichier local par la réponse du serveur
      setUploadedFiles(prev => 
        prev.map(f => f.id === localFile.id 
          ? { 
              ...f, 
              id: response.id, 
              status: 'en_attente' as const,
              file: undefined 
            } 
          : f
        )
      )
      
      toast.success(`${localFile.name} uploadé avec succès`)
    } catch (error) {
      setUploadedFiles(prev => 
        prev.map(f => f.id === localFile.id ? { ...f, status: 'error' as const } : f)
      )
      toast.error(`Erreur lors de l'upload de ${localFile.name}`)
    }
  }

  // Upload tous les fichiers en attente
  const uploadAllFiles = async () => {
    const filesToUpload = uploadedFiles.filter(f => f.file && f.status === 'en_attente')
    
    if (filesToUpload.length === 0) {
      toast.info('Aucun fichier à uploader')
      return
    }

    setIsUploading(true)
    
    for (const file of filesToUpload) {
      await uploadFile(file)
    }
    
    setIsUploading(false)
  }

  // Lancer le traitement OCR d'une facture
  const handleProcess = async (fileId: string | number) => {
    if (!token) return

    // Si c'est un fichier local, d'abord l'uploader
    const file = uploadedFiles.find(f => f.id === fileId)
    if (file?.file) {
      await uploadFile(file)
      return
    }

    setUploadedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, status: 'en_cours' as const } : f)
    )
    
    // Naviguer vers la page de traitement
    router.push(`/dashboard/processing/${fileId}`)
  }

  const removeFile = async (fileId: string | number) => {
    const file = uploadedFiles.find(f => f.id === fileId)
    
    // Si c'est un fichier déjà sur le serveur, le supprimer via l'API
    if (token && file && !file.file && typeof fileId === 'number') {
      try {
        await invoicesApi.deleteInvoice(fileId, token)
        toast.success('Fichier supprimé')
      } catch {
        toast.error('Erreur lors de la suppression')
        return
      }
    }
    
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer factures</h1>
        <p className="text-muted-foreground">Importez vos factures pour les traiter par OCR</p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Importer factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium mb-2">
              Glissez et déposez votre facture ici
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou cliquez pour sélectionner un fichier
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Parcourir
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Formats acceptés: PDF, JPG, PNG (max 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fichiers importés</CardTitle>
          {uploadedFiles.some(f => f.file && f.status === 'en_attente') && (
            <Button onClick={uploadAllFiles} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader tout
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {uploadedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <File className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun fichier importé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom Fichier</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {file.name}
                      </div>
                    </TableCell>
                    <TableCell>{file.size}</TableCell>
                    <TableCell>{file.date}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[file.status]}>
                        {file.status === 'uploading' && (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {statusLabels[file.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {file.status === 'en_attente' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcess(file.id)}
                          >
                            {file.file ? 'Uploader' : 'Traiter'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFile(file.id)}
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
