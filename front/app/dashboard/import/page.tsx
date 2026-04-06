'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import * as invoicesApi from '@/lib/api/invoices'
import { toast } from 'sonner'

interface UploadedFile {
  id: string | number
  name: string
  size: string
  date: string
  status: 'uploading' | 'en_cours' | 'complete' | 'error'
  file?: File
}

export default function ImportPage() {
  const router = useRouter()
  const { token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  console.log('📌 ImportPage chargée - token présent ?', !!token)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: `local-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'uploading' as const,
        file: file,
      }))
      setFiles(prev => [...newFiles, ...prev])
      console.log('✅ Fichiers sélectionnés :', newFiles.length)
    }
  }

  const uploadSingleFile = async (fileItem: UploadedFile) => {
    if (!token || !fileItem.file) {
      toast.error('Token manquant ou fichier invalide')
      return
    }

    console.log('🚀 Début upload du fichier :', fileItem.name)

    setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' } : f))

    try {
      const response = await invoicesApi.uploadInvoice(fileItem.file, token)
      
      console.log('✅ Upload réussi ! ID reçu du backend :', response.id)

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, id: response.id, status: 'en_cours', file: undefined } : f
      ))

      toast.success(`✅ ${fileItem.name} uploadé avec succès`)

      // Redirection vers la page de traitement
      setTimeout(() => {
        router.push(`/dashboard/processing/${response.id}`)
      }, 1200)

    } catch (err: any) {
      console.error('❌ Erreur lors de l’upload :', err)
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f))
      toast.error(`Échec upload de ${fileItem.name}`)
    }
  }

  const handleUploadAll = async () => {
    setIsUploading(true)
    const filesToUpload = files.filter(f => f.file)
    for (const file of filesToUpload) {
      await uploadSingleFile(file)
    }
    setIsUploading(false)
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Importer des factures</h1>

      <Card>
        <CardContent className="p-12 text-center">
          <Upload className="mx-auto h-16 w-16 text-primary mb-6" />
          <p className="text-2xl font-medium">Glissez vos factures ici</p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button 
            onClick={() => fileInputRef.current?.click()}
            size="lg"
            className="mt-8"
          >
            <FileText className="mr-2 h-5 w-5" />
            Sélectionner des fichiers
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fichiers sélectionnés ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map(file => (
                  <TableRow key={file.id}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{file.size}</TableCell>
                    <TableCell>
                      <Badge className={file.status === 'uploading' ? 'bg-blue-500' : 'bg-orange-500'}>
                        {file.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => uploadSingleFile(file)}>
                        Uploader
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button onClick={handleUploadAll} disabled={isUploading} className="w-full mt-6">
              {isUploading ? (
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Upload en cours... </>
              ) : (
                'Uploader tous les fichiers'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}