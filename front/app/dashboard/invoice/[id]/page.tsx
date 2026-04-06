'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Trash2,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockInvoices, mockExtractedData } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import * as invoicesApi from '@/lib/api/invoices';
import { toast } from 'sonner';

interface ExtractedData {
  numeroFacture: string;
  date: string;
  fournisseur: string;
  adresseFournisseur: string;
  client: string;
  adresseClient: string;
  totalHT: number;
  tva: number;
  totalTTC: number;
  produits: { id: string; nom: string; quantite: number; prixUnitaire: number; total: number }[];
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [invoice, setInvoice] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData>(mockExtractedData);
  const [confidenceScore, setConfidenceScore] = useState(90);

  // Charger les données de la facture
  useEffect(() => {
    const loadInvoice = async () => {
      if (!params.id) return;

      setIsLoading(true);
      
      try {
        if (token) {
          const apiInvoice = await invoicesApi.getInvoice(Number(params.id), token);
          
          setInvoice(apiInvoice);
          setConfidenceScore(apiInvoice.confidenceScore || 90);

          if (apiInvoice.extractedData) {
            setExtractedData({
              ...apiInvoice.extractedData,
              adresseFournisseur: apiInvoice.extractedData.adresseFournisseur || '',
              client: apiInvoice.extractedData.client || '',
              adresseClient: apiInvoice.extractedData.adresseClient || '',
              produits: apiInvoice.extractedData.produits || []
            });
          }
        } else {
          throw new Error('No token');
        }
      } catch (error) {
        console.error(error);
        const mockInvoice = mockInvoices.find(inv => String(inv.id) === String(params.id)) || mockInvoices[0];
        setInvoice(mockInvoice);
        setExtractedData(mockInvoice.extractedData || mockExtractedData);
        setConfidenceScore(mockInvoice.confidenceScore || 90);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [params.id, token]);

  // Mise à jour d'un champ de données extraites
  const updateField = (field: keyof ExtractedData, value: string | number) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  // ====================== BOUTONS FONCTIONNELS ======================
  const handleReprocess = () => {
    router.push(`/dashboard/processing/${Number(params.id)}`);
  };

  const handleDelete = async () => {
    if (!token || !invoice?.id) {
      toast.error("ID de facture invalide");
      return;
    }
    if (!confirm('Supprimer définitivement cette facture ?')) return;

    try {
      await invoicesApi.deleteInvoice(Number(invoice.id), token);
      toast.success('Facture supprimée avec succès');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleValidate = async () => {
    if (!token || !invoice?.id) return;
    setIsSaving(true);
    try {
      await invoicesApi.validateInvoice(Number(invoice.id), token, {
        approved: true,
        corrections: extractedData
      });
      toast.success('✅ Facture validée avec succès');
      router.push('/dashboard/history');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!token || !invoice?.id) return;
    setIsSaving(true);
    try {
      await invoicesApi.validateInvoice(Number(invoice.id), token, {
        approved: false,
        corrections: extractedData || {},
        rejectionReason: rejectionReason || "Rejet manuel"
      });
      toast.success('Facture rejetée avec succès');
      setIsRejectDialogOpen(false);
      router.push('/dashboard/history');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du rejet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token || !invoice?.id) return;
    setIsSaving(true);
    try {
      await invoicesApi.validateInvoice(Number(invoice.id), token, {
        approved: false,
        corrections: extractedData
      });
      toast.success('✅ Modifications enregistrées');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    toast.info("Export non encore implémenté");
    setIsExportDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Facture non trouvée</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - inchangé */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.fileName}</h1>
            <Badge className={cn(
              invoice.status === 'validee' && 'bg-success text-success-foreground',
              invoice.status === 'rejetee' && 'bg-destructive text-destructive-foreground',
              invoice.status === 'en_cours' && 'bg-warning text-warning-foreground',
            )}>
              {invoice.status === 'validee' && 'Traité avec succès'}
              {invoice.status === 'rejetee' && 'Rejetée'}
              {invoice.status === 'en_cours' && 'En cours'}
              {invoice.status === 'en_attente' && 'En attente'}
            </Badge>
          </div>
          <p className="text-muted-foreground">Score de confiance: {confidenceScore}%</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReprocess}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-traiter
          </Button>
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exporter la facture</DialogTitle>
                <DialogDescription>
                  Choisissez le format d&apos;export pour télécharger les données
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Format d&apos;export</Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'pdf' | 'csv' | 'json')}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ================== APERÇU DU DOCUMENT (seule partie corrigée) ================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aperçu du document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center border overflow-hidden">
              {invoice?.filePath ? (
                <object
                  data={`http://127.0.0.1:8000/${invoice.filePath}`}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  {/* Fallback pour les images */}
                  <img 
                    src={`http://127.0.0.1:8000/${invoice.filePath}`} 
                    alt="Facture" 
                    className="max-h-full max-w-full object-contain"
                  />
                </object>
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="font-medium">{invoice.fileName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliquez pour voir le document original
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Le reste de ton code reste EXACTEMENT identique */}
        <div className="space-y-6">
          {/* Confidence Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score de confiance</p>
                  <p className="text-3xl font-bold">{confidenceScore}%</p>
                </div>
                <div className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full',
                  confidenceScore >= 80 ? 'bg-success/10 text-success' : 
                  confidenceScore >= 60 ? 'bg-warning/10 text-warning' : 
                  'bg-destructive/10 text-destructive'
                )}>
                  {confidenceScore >= 80 ? (
                    <CheckCircle className="h-8 w-8" />
                  ) : confidenceScore >= 60 ? (
                    <AlertTriangle className="h-8 w-8" />
                  ) : (
                    <XCircle className="h-8 w-8" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Data */}
          <Card>
            <CardHeader>
              <CardTitle>Informations extraites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Numéro facture</Label>
                  <Input 
                    value={extractedData.numeroFacture} 
                    onChange={(e) => updateField('numeroFacture', e.target.value)}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input 
                    value={extractedData.date} 
                    onChange={(e) => updateField('date', e.target.value)}
                    className="mt-1" 
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fournisseur</Label>
                <Input 
                  value={extractedData.fournisseur} 
                  onChange={(e) => updateField('fournisseur', e.target.value)}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Adresse fournisseur</Label>
                <Input 
                  value={extractedData.adresseFournisseur} 
                  onChange={(e) => updateField('adresseFournisseur', e.target.value)}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Client</Label>
                <Input 
                  value={extractedData.client} 
                  onChange={(e) => updateField('client', e.target.value)}
                  className="mt-1" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Montants */}
          <Card>
            <CardHeader>
              <CardTitle>Montants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Total HT</Label>
                  <Input 
                    value={extractedData.totalHT.toFixed(2)} 
                    onChange={(e) => updateField('totalHT', parseFloat(e.target.value) || 0)}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">TVA</Label>
                  <Input 
                    value={extractedData.tva.toFixed(2)} 
                    onChange={(e) => updateField('tva', parseFloat(e.target.value) || 0)}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total TTC</Label>
                  <Input 
                    value={extractedData.totalTTC.toFixed(2)} 
                    onChange={(e) => updateField('totalTTC', parseFloat(e.target.value) || 0)}
                    className="mt-1 font-semibold" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tableau des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extractedData.produits.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.nom}</TableCell>
                  <TableCell className="text-right">{product.quantite}</TableCell>
                  <TableCell className="text-right">{product.prixUnitaire.toFixed(2)} €</TableCell>
                  <TableCell className="text-right font-medium">{product.total.toFixed(2)} €</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts */}
      {confidenceScore < 80 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Certaines données ont un score de confiance faible et nécessitent une vérification manuelle.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Rejeter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter la facture</DialogTitle>
              <DialogDescription>
                Veuillez indiquer la raison du rejet
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Raison du rejet</Label>
              <Textarea 
                className="mt-2" 
                placeholder="Ex: Données illisibles, montants incorrects..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isSaving}>
                {isSaving ? 'En cours...' : 'Confirmer le rejet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={handleValidate} disabled={isSaving}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {isSaving ? 'En cours...' : 'Valider'}
        </Button>
        <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'En cours...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}