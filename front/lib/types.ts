export interface User {
  id: string
  nom: string
  prenom: string
  email: string
  dateAnniversaire?: string
  cin?: string
  role: 'admin' | 'user'
  createdAt: string
}

export interface Invoice {
  id: string
  fileName: string
  fileSize: string
  fournisseur: string
  date: string
  status: 'en_cours' | 'en_attente' | 'validee' | 'rejetee' | 'erreur'
  totalHT?: number
  tva?: number
  totalTTC?: number
  confidenceScore?: number
  createdAt: string
  extractedData?: ExtractedInvoiceData
}

export interface ExtractedInvoiceData {
  numeroFacture: string
  date: string
  fournisseur: string
  adresseFournisseur: string
  client: string
  adresseClient: string
  totalHT: number
  tva: number
  totalTTC: number
  produits: InvoiceProduct[]
}

export interface InvoiceProduct {
  id: string
  nom: string
  quantite: number
  prixUnitaire: number
  total: number
}

export interface SystemLog {
  id: string
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  userId?: string
}

export interface OCRSettings {
  confidenceThreshold: number
  language: 'fr' | 'en' | 'ar'
  documentType: 'facture' | 'bon_livraison' | 'autre'
  preprocessing: {
    improveContrast: boolean
    removeNoise: boolean
  }
  ocrEngine: 'tesseract'
}

export interface DashboardStats {
  totalInvoices: number
  enCours: number
  validees: number
  rejetees: number
  monthlyData: {
    month: string
    count: number
  }[]
}
