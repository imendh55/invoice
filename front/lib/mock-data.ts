import type { User, Invoice, SystemLog, DashboardStats, ExtractedInvoiceData } from './types'

export const mockUsers: User[] = [
  {
    id: '1',
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@pharmacie.com',
    dateAnniversaire: '1985-03-15',
    cin: 'AB123456',
    role: 'admin',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    nom: 'Martin',
    prenom: 'Sophie',
    email: 'sophie.martin@pharmacie.com',
    dateAnniversaire: '1990-07-22',
    cin: 'CD789012',
    role: 'user',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    nom: 'Bernard',
    prenom: 'Pierre',
    email: 'pierre.bernard@pharmacie.com',
    dateAnniversaire: '1988-11-08',
    cin: 'EF345678',
    role: 'user',
    createdAt: '2024-03-10',
  },
]

export const mockExtractedData: ExtractedInvoiceData = {
  numeroFacture: 'FAC-2024-001',
  date: '2024-03-15',
  fournisseur: 'Pharma Distribution SARL',
  adresseFournisseur: '123 Rue de la Santé, 75014 Paris',
  client: 'Pharmacie du Centre',
  adresseClient: '45 Avenue des Médicaments, 75001 Paris',
  totalHT: 2500.00,
  tva: 500.00,
  totalTTC: 3000.00,
  produits: [
    { id: '1', nom: 'Doliprane 1000mg', quantite: 100, prixUnitaire: 5.50, total: 550.00 },
    { id: '2', nom: 'Amoxicilline 500mg', quantite: 50, prixUnitaire: 12.00, total: 600.00 },
    { id: '3', nom: 'Ibuprofène 400mg', quantite: 75, prixUnitaire: 8.00, total: 600.00 },
    { id: '4', nom: 'Vitamine C 1000mg', quantite: 150, prixUnitaire: 5.00, total: 750.00 },
  ],
}

export const mockInvoices: Invoice[] = [
  {
    id: 'INV-001',
    fileName: 'facture1.pdf',
    fileSize: '2MB',
    fournisseur: 'Pharma Distribution',
    date: '2024-03-15',
    status: 'validee',
    totalHT: 2500.00,
    tva: 500.00,
    totalTTC: 3000.00,
    confidenceScore: 95,
    createdAt: '2024-03-15',
    extractedData: mockExtractedData,
  },
  {
    id: 'INV-002',
    fileName: 'facture2.jpg',
    fileSize: '1MB',
    fournisseur: 'MediSupply',
    date: '2024-03-14',
    status: 'en_cours',
    confidenceScore: 78,
    createdAt: '2024-03-14',
  },
  {
    id: 'INV-003',
    fileName: 'facture3.pdf',
    fileSize: '3MB',
    fournisseur: 'HealthCare Plus',
    date: '2024-03-13',
    status: 'rejetee',
    confidenceScore: 45,
    createdAt: '2024-03-13',
  },
  {
    id: 'INV-004',
    fileName: 'facture4.pdf',
    fileSize: '1.5MB',
    fournisseur: 'BioMed France',
    date: '2024-03-12',
    status: 'en_attente',
    createdAt: '2024-03-12',
  },
  {
    id: 'INV-005',
    fileName: 'facture5.jpg',
    fileSize: '2.2MB',
    fournisseur: 'Pharma Express',
    date: '2024-03-11',
    status: 'validee',
    totalHT: 1800.00,
    tva: 360.00,
    totalTTC: 2160.00,
    confidenceScore: 92,
    createdAt: '2024-03-11',
  },
]

export const mockSystemLogs: SystemLog[] = [
  {
    id: '1',
    timestamp: '2024-03-15T10:32:00',
    type: 'info',
    message: 'OCR lancé pour facture1.pdf',
    userId: '1',
  },
  {
    id: '2',
    timestamp: '2024-03-15T10:33:00',
    type: 'success',
    message: 'Texte extrait avec succès',
    userId: '1',
  },
  {
    id: '3',
    timestamp: '2024-03-15T10:34:00',
    type: 'warning',
    message: 'Champ "Total" faible confiance (65%)',
    userId: '1',
  },
  {
    id: '4',
    timestamp: '2024-03-15T10:35:00',
    type: 'error',
    message: 'Erreur extraction TVA - format non reconnu',
    userId: '2',
  },
  {
    id: '5',
    timestamp: '2024-03-15T10:36:00',
    type: 'success',
    message: 'Validation utilisateur confirmée',
    userId: '1',
  },
]

export const mockDashboardStats: DashboardStats = {
  totalInvoices: 156,
  enCours: 12,
  validees: 128,
  rejetees: 16,
  monthlyData: [
    { month: 'Jan', count: 35 },
    { month: 'Fév', count: 42 },
    { month: 'Mar', count: 38 },
    { month: 'Avr', count: 41 },
  ],
}

export const currentUser: User = mockUsers[0]
